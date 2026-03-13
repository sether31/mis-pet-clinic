<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../helper/log_audit.php';

$decoded = validate_auth(['pet_owner']); 

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents("php://input"), true);

  if (!isset($data['order_id'])) {
    throw new Exception("Order ID is required.");
  }

  $orderId = (int)$data['order_id'];
  $userId = $decoded->user_id;

  // 1. Verify ownership and get branch context
  $stmt = $pdo->prepare("
    SELECT order_status, branch_id 
    FROM order_tb 
    WHERE order_id = :oid AND user_id = :uid
  ");
  $stmt->execute([':oid' => $orderId, ':uid' => $userId]);
  $order = $stmt->fetch();

  if (!$order) {
    throw new Exception("Reservation not found.");
  }

  if ($order['order_status'] !== 'pending') {
    throw new Exception("Only pending reservations can be cancelled.");
  }

  $pdo->beginTransaction();

  // Update the order status
  $updateStmt = $pdo->prepare("
    UPDATE order_tb 
    SET order_status = 'cancelled', 
      cancellation_reason = 'Cancelled by user' 
    WHERE order_id = :oid
  ");
  $updateStmt->execute([':oid' => $orderId]);

  // Update the Payment Status
  $payStmt = $pdo->prepare("
    UPDATE payments_tb 
    SET payment_status = 'cancelled' 
    WHERE order_id = :oid
  ");
  $payStmt->execute([':oid' => $orderId]);

  // Get items from the order
  $itemStmt = $pdo->prepare("
    SELECT inventory_id, quantity 
    FROM order_items_tb 
    WHERE order_id = :oid
  ");
  $itemStmt->execute([':oid' => $orderId]);
  $items = $itemStmt->fetchAll();

  // Return quantities to inventory_tb
  $stockStmt = $pdo->prepare("
    UPDATE inventory_tb 
    SET stock_level = stock_level + :qty 
    WHERE inventory_id = :inv_id
  ");

  foreach ($items as $item) {
    if (!empty($item['inventory_id'])) {
      $stockStmt->execute([
        ':qty' => $item['quantity'],
        ':inv_id' => $item['inventory_id']
      ]);
    }
  }

  // Audit Log
  log_audit($pdo, $userId, null, $order['branch_id'], 'CANCEL', 'RESERVATION', $orderId);

  $pdo->commit();

  echo json_encode([
    "success" => true, 
    "message" => "Reservation and Payment cancelled. Stock restored."
  ]);

} catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) {
    $pdo->rollBack();
  }
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}