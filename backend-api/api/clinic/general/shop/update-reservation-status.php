<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';

$decoded = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$user_id = $decoded->user_id;

$data = json_decode(file_get_contents("php://input"));

$order_id = $data->order_id ?? null;
$status = strtolower($data->status ?? '');
$reason = $data->reason ?? null;

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

  $stmtCheck = $pdo->prepare(
    "SELECT o.order_status, o.pickup_date, o.branch_id, b.clinic_id 
    FROM order_tb o 
    JOIN clinic_branches_tb b ON o.branch_id = b.branch_id 
    WHERE o.order_id = ?"
  );
  $stmtCheck->execute([$order_id]);
  $currentOrder = $stmtCheck->fetch();

  if (!$currentOrder) {
    throw new Exception("Order not found.");
  }

  //  Prevent confirming if overdue
  $today = date('Y-m-d');
  $isOverdue = $currentOrder['pickup_date'] < $today;

  if ($status === 'confirmed' && $isOverdue) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Cannot approve an expired reservation."]);
    exit;
  }

  // Prevent redundant updates
  if ($currentOrder['order_status'] === $status) {
    $pdo->rollBack();
    echo json_encode(["success" => true, "message" => "Order is already {$status}."]);
    exit;
  }

  $branch_id = $currentOrder['branch_id'];
  $clinic_id = $currentOrder['clinic_id'];

  // UPDATE THE ORDER STATUS
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
  $stmt->execute([$status, $final_reason, $user_id, $order_id]);

  // INVENTORY RESTOCK
  $active_statuses = ['pending', 'confirmed'];
  if (($status === 'cancelled' || $status === 'rejected') && in_array($currentOrder['order_status'], $active_statuses)) {
    $itemsStmt = $pdo->prepare("SELECT inventory_id, quantity FROM order_items_tb WHERE order_id = ?");
    $itemsStmt->execute([$order_id]);
    $items = $itemsStmt->fetchAll();

    $restockStmt = $pdo->prepare(
      "UPDATE inventory_tb SET stock_level = stock_level + ?, updated_at = CURRENT_TIMESTAMP WHERE inventory_id = ?"
    );
    
    foreach ($items as $item) {
      if (!empty($item['inventory_id'])) {
        $restockStmt->execute([$item['quantity'], $item['inventory_id']]);
      }
    }
  }

  // PAYMENT STATUS 
  if($status === 'completed') {
    $paymentStmt = $pdo->prepare("UPDATE payments_tb SET payment_status = 'paid' WHERE order_id = ?");
    $paymentStmt->execute([$order_id]);
  } elseif ($status === 'cancelled' || $status === 'rejected') {
    $paymentStmt = $pdo->prepare("UPDATE payments_tb SET payment_status = 'cancelled' WHERE order_id = ?");
    $paymentStmt->execute([$order_id]);
  }

  // AUDIT LOG
  $action_map = ['cancelled' => 'CANCEL', 'rejected' => 'REJECT', 'completed' => 'COMPLETE', 'confirmed' => 'CONFIRM'];
  $action_type = $action_map[$status] ?? 'UPDATE';

  log_audit($pdo, $user_id, $clinic_id, $branch_id, $action_type, 'RESERVATION', $order_id);

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Order marked as {$status}!"]);

} catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}