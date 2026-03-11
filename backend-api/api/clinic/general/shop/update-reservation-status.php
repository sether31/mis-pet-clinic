<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

$data = json_decode(file_get_contents("php://input"));

$order_id = $data->order_id ?? null;
$status = strtolower($data->status ?? '');
$reason = $data->reason ?? null;

if (!$order_id || !$status) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Order ID and Status are required."]);
  exit;
}

// Security Check: Only allow these exact statuses
$valid_statuses = ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'];
if (!in_array($status, $valid_statuses)) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Invalid status provided."]);
  exit;
}

try {
  $pdo = (new Database)->pdo;
  
  $pdo->beginTransaction();

  // UPDATE THE ORDER STATUS
  $stmt = $pdo->prepare("
    UPDATE order_tb 
    SET 
      order_status = ?, 
      cancellation_reason = ?, 
      updated_at = CURRENT_TIMESTAMP
    WHERE order_id = ?
  ");
  
  // If it's not cancelled or rejected, ensure the reason is saved as NULL
  $final_reason = ($status === 'cancelled' || $status === 'rejected') ? $reason : null;
  $stmt->execute([$status, $final_reason, $order_id]);


  // INVENTORY RESTOCK
  if ($status === 'cancelled' || $status === 'rejected') {
    $itemsStmt = $pdo->prepare("SELECT inventory_id, quantity FROM order_items_tb WHERE order_id = ?");
    $itemsStmt->execute([$order_id]);
    $items = $itemsStmt->fetchAll();

    $restockStmt = $pdo->prepare("
      UPDATE inventory_tb 
      SET stock_level = stock_level + ?, updated_at = CURRENT_TIMESTAMP 
      WHERE inventory_id = ?
    ");
    
    foreach ($items as $item) {
      if (!empty($item['inventory_id'])) {
        $restockStmt->execute([$item['quantity'], $item['inventory_id']]);
      }
    }
  }

  // PAYMENT IF COMPLETED
  if($status === 'completed') {
    $paymentStmt = $pdo->prepare(
      "UPDATE payments_tb 
      SET payment_status = 'paid' 
      WHERE order_id = ?"
    );
    $paymentStmt->execute([$order_id]);
  } else if ($status === 'cancelled' || $status === 'rejected') {
    $paymentStmt = $pdo->prepare("
      UPDATE payments_tb 
      SET payment_status = 'cancelled' 
      WHERE order_id = ?
    ");
    $paymentStmt->execute([$order_id]);
  }


  $pdo->commit();

  echo json_encode([
    "success" => true,
    "message" => "Order marked as {$status} successfully!"
  ]);

} catch (Exception $e) {
  if ($pdo->inTransaction()) {
    $pdo->rollBack();
  }
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}
?>