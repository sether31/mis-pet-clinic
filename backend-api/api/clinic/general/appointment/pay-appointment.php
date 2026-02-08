<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents("php://input"));
    
  if(!isset($data->appointment_id) || !isset($data->branch_id)) {
    throw new Exception("Missing required transaction data.");
  }

  $pdo->beginTransaction();

  // get owner details
  $stmtUser = $pdo->prepare(
    "SELECT u.user_id 
    FROM appointments_tb a
    JOIN user_tb u ON a.user_id = u.user_id
    WHERE a.appointment_id = ?"
  );
  $stmtUser->execute([$data->appointment_id]);
  $owner = $stmtUser->fetch();

  if (!$owner) throw new Exception("Appointment owner not found.");

  // if cash then appointment and order will be completed 
  // if not cash then appointment billed and order pending
  $is_card = (strtolower($data->payment_method ?? '') === 'card');
  
  $appointmentStatus = $is_card ? 'billed' : 'completed';
  $orderStatus = $is_card ? 'pending' : 'completed';
  $paymentStatus = $is_card ? 'unpaid' : 'paid';
  // check if card then the method will be null until user pay
  $finalMethod = $is_card ? null : 'cash';

  // create order
  $orderStmt = $pdo->prepare("INSERT INTO order_tb (user_id, branch_id, order_status, total_amount) VALUES (?, ?, ?, ?)");
  $orderStmt->execute([$owner['user_id'], $data->branch_id, $orderStatus, $data->total]);
  $order_id = $pdo->lastInsertId();

  // create payment
  $payStmt = $pdo->prepare(
    "INSERT INTO payments_tb (
      branch_id, 
      order_id, 
      amount, 
      payment_method, 
      payment_status, 
      payment_type
    ) VALUES (?, ?, ?, ?, ?, 'appointment')"
  );
  $payStmt->execute([
    $data->branch_id, 
    $order_id, 
    $data->total, 
    $finalMethod, 
    $paymentStatus
  ]);

  // process order items
  $itemStmt = $pdo->prepare("INSERT INTO order_items_tb (order_id, product_id, service_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?)");
  // update inventory
  $invUpdate = $pdo->prepare("UPDATE inventory_tb SET stock_level = stock_level - ? WHERE product_id = ? AND branch_id = ?");

  foreach($data->items as $item) {
    $subtotal = $item->qty * $item->price;
    $p_id = ($item->type === 'product') ? ($item->product_id ?? null) : null;
    $s_id = ($item->type === 'service') ? ($item->service_id ?? null) : null;

    $itemStmt->execute([$order_id, $p_id, $s_id, $item->qty, $item->price, $subtotal]);

    // update product stock
    if($item->type === 'product' && !empty($p_id)) {
      $invUpdate->execute([$item->qty, $p_id, $data->branch_id]);
    }
  }

  // update appointment status
  $pdo->prepare("UPDATE appointments_tb SET status = ?, order_id = ? WHERE appointment_id = ?")
    ->execute([$appointmentStatus, $order_id, $data->appointment_id]);

  $pdo->commit();

  echo json_encode([
    "success" => true, 
    "message" => $is_card ? "Billing generated! User can now pay in app." : "Cash payment processed successfully.", 
    "order_id" => $order_id
  ]);
} catch(Exception $e) {
  if(isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}