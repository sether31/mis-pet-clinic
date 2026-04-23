<?php
// 1. CORS HEADERS - MUST be at the very top to fix the browser "net::ERR_FAILED"
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// 2. Handle Preflight OPTIONS request (Required for complex POST requests)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';
require_once __DIR__ . '/../../../../helper/send_notification.php';

$decoded = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$admin_user_id = $decoded->user_id;

$data = json_decode(file_get_contents("php://input"));

$order_id = $data->order_id ?? null;
$status = strtolower($data->status ?? '');
$reason = $data->reason ?? null;
$cash_received = $data->cash_received ?? null;
$cash_change = $data->cash_change ?? null;

if (!$order_id || !$status) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Order ID and Status are required."]);
    exit;
}

$valid_statuses = ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'];
if (!in_array($status, $valid_statuses)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid status provided."]);
    exit;
}

try {
    $pdo = (new Database)->pdo;
    $pdo->beginTransaction();

    // Fetch current order details
    $stmtCheck = $pdo->prepare(
        "SELECT o.order_status, o.pickup_date, o.branch_id, o.user_id as pet_owner_id, b.clinic_id, b.name as branch_name 
        FROM order_tb o 
        JOIN clinic_branches_tb b ON o.branch_id = b.branch_id 
        WHERE o.order_id = ?"
    );
    $stmtCheck->execute([$order_id]);
    $currentOrder = $stmtCheck->fetch();

    if (!$currentOrder) {
        throw new Exception("Order not found.");
    }

    // Overdue check
    $isOverdue = $currentOrder['pickup_date'] < date('Y-m-d');
    if ($status === 'confirmed' && $isOverdue) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Cannot approve an expired reservation."]);
        exit;
    }

    if ($currentOrder['order_status'] === $status) {
        $pdo->rollBack();
        echo json_encode(["success" => true, "message" => "Order is already {$status}."]);
        exit;
    }

    // UPDATE THE ORDER STATUS
    $stmt = $pdo->prepare(
        "UPDATE order_tb 
        SET order_status = ?, 
            cancellation_reason = ?, 
            last_updated_by = ?, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE order_id = ?"
    );
    $final_reason = ($status === 'cancelled' || $status === 'rejected') ? $reason : null;
    $stmt->execute([$status, $final_reason, $admin_user_id, $order_id]);

    // INVENTORY RESTOCK
    $active_statuses = ['pending', 'confirmed'];
    if (($status === 'cancelled' || $status === 'rejected') && in_array($currentOrder['order_status'], $active_statuses)) {
        $itemsStmt = $pdo->prepare("SELECT inventory_id, quantity FROM order_items_tb WHERE order_id = ?");
        $itemsStmt->execute([$order_id]);
        $items = $itemsStmt->fetchAll();

        $restockStmt = $pdo->prepare("UPDATE inventory_tb SET stock_level = stock_level + ? WHERE inventory_id = ?");
        foreach ($items as $item) {
            if (!empty($item['inventory_id'])) $restockStmt->execute([$item['quantity'], $item['inventory_id']]);
        }
    }

    // PAYMENT HANDLING
    if ($status === 'completed') {
        $stmtPay = $pdo->prepare("SELECT amount FROM payments_tb WHERE order_id = ?");
        $stmtPay->execute([$order_id]);
        $payment = $stmtPay->fetch();

        if ($payment) {
            $total_amount = $payment['amount'];
            
            // Logic: use provided cash or default to exact amount if null
            $db_cash_received = ($cash_received !== null) ? (float)$cash_received : (float)$total_amount;
            $db_cash_change   = ($cash_received !== null) ? (float)$cash_change : 0;

            $stmtUpdatePay = $pdo->prepare("
                UPDATE payments_tb 
                SET 
                    payment_status = 'paid', 
                    cash_received = ?, 
                    cash_change = ?,
                    payment_method = 'CASH' 
                WHERE order_id = ?
            ");
            $stmtUpdatePay->execute([$db_cash_received, $db_cash_change, $order_id]);
        }
    } elseif ($status === 'cancelled' || $status === 'rejected') {
        $pdo->prepare("UPDATE payments_tb SET payment_status = 'cancelled' WHERE order_id = ?")->execute([$order_id]);
    }

    // Get item list for notification
    $nameStmt = $pdo->prepare("
        SELECT GROUP_CONCAT(
            CONCAT(
                p.name, 
                IF(p.brand_name IS NOT NULL AND p.brand_name != '', CONCAT(' (', p.brand_name, ')'), ''),
                IF(p.dosage IS NOT NULL AND p.dosage != '', CONCAT(' ', p.dosage), '')
            ) SEPARATOR ', '
        ) as item_list
        FROM order_items_tb oi
        JOIN products_tb p ON oi.product_id = p.product_id
        WHERE oi.order_id = ?
    ");
    $nameStmt->execute([$order_id]);
    $itemRow = $nameStmt->fetch();
    $order_names = $itemRow['item_list'] ?? 'Items';
    if (strlen($order_names) > 60) $order_names = substr($order_names, 0, 57) . '...';

    // NOTIFICATIONS
    $feedback = !empty($reason) ? " Reason: " . $reason : " No specific reason provided.";
    $notif_data = [
        'confirmed' => ['title' => 'Ready for Pickup!', 'msg' => "Your reservation for {$order_names} is ready at {$currentOrder['branch_name']}."],
        'rejected'  => ['title' => 'Reservation Rejected', 'msg' => "Your reservation for {$order_names} was rejected. {$feedback}"],
        'completed' => ['title' => 'Order Completed', 'msg' => "Your order for {$order_names} has been picked up. Thank you!"],
        'cancelled' => ['title' => 'Reservation Cancelled', 'msg' => "Your reservation for {$order_names} was cancelled. {$feedback}"]
    ];

    if (isset($notif_data[$status])) {
        send_notification($pdo, $currentOrder['pet_owner_id'], 'reservation', $notif_data[$status]['title'], $notif_data[$status]['msg']);
    }

    $pdo->commit();
    echo json_encode(["success" => true, "message" => "Order marked as {$status}!"]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}