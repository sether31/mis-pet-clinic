<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';
require_once __DIR__ . '/../../../../helper/send_notification.php'; // Ensure this is the path to your helper

$decoded = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$admin_user_id = $decoded->user_id; // Rename to avoid confusion with the pet owner

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

  // 1. UPDATED QUERY: Fetch pet_owner_id (user_id) to send notification
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

  // 2. UPDATE THE ORDER STATUS
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

  // PAYMENT STATUS 
  if($status === 'completed') {
      $pdo->prepare("UPDATE payments_tb SET payment_status = 'paid' WHERE order_id = ?")->execute([$order_id]);
  } elseif ($status === 'cancelled' || $status === 'rejected') {
      $pdo->prepare("UPDATE payments_tb SET payment_status = 'cancelled' WHERE order_id = ?")->execute([$order_id]);
  }

  $nameStmt = $pdo->prepare("
      SELECT GROUP_CONCAT(p.name SEPARATOR ', ') as item_list
      FROM order_items_tb oi
      JOIN inventory_tb i ON oi.inventory_id = i.inventory_id
      JOIN products_tb p ON i.product_id = p.product_id
      WHERE oi.order_id = ?
  ");
  $nameStmt->execute([$order_id]);
  $itemRow = $nameStmt->fetch();
  
  $order_names = $itemRow['item_list'] ?? 'Items';
  if (strlen($order_names) > 60) {
      $order_names = substr($order_names, 0, 57) . '...';
  }

  // 3. SEND NOTIFICATION TO PET OWNER
  $notif_data = [
      'confirmed' => ['title' => 'Reservation Ready for pick up!', 'msg' => "Your reservation #$order_id ($order_names) is ready for pickup at {$currentOrder['branch_name']}."],
      'rejected'  => ['title' => 'Reservation Rejected', 'msg' => "Sorry, your reservation #$order_id ($order_names) was rejected. Reason: " . ($reason ?? 'No reason provided')],
      'completed' => ['title' => 'Item Picked Up', 'msg' => "Thank you! Your order #$order_id ($order_names) has been marked as completed/picked up."],
      'cancelled' => ['title' => 'Reservation Cancelled', 'msg' => "Your reservation #$order_id ($order_names) has been successfully cancelled."]
  ];

  if (isset($notif_data[$status])) {
      send_notification(
          $pdo, 
          $currentOrder['pet_owner_id'], 
          'reservation', 
          $notif_data[$status]['title'], 
          $notif_data[$status]['msg']
      );
  }

  // AUDIT LOG
  $action_map = ['cancelled' => 'CANCEL', 'rejected' => 'REJECT', 'completed' => 'COMPLETE', 'confirmed' => 'CONFIRM'];
  log_audit($pdo, $admin_user_id, $currentOrder['clinic_id'], $currentOrder['branch_id'], $action_map[$status] ?? 'UPDATE', 'RESERVATION', $order_id);

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Order marked as {$status}!"]);

} catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}