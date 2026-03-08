<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';
require_once __DIR__ . '/../../../../helper/send_notification.php';

$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents("php://input"));
    
  if(!isset($data->appointment_id) || !isset($data->branch_id)) {
    throw new Exception("Missing required transaction data.");
  }

  $pdo->beginTransaction();

  // get owner details
  $stmtInfo = $pdo->prepare(
    "SELECT 
      a.user_id, a.pet_id, a.start_time, a.staff_id as assigned_staff_id,
      bs.custom_name, bs.price as service_price,
      p.name as pet_name, cb.name as clinic_name
    FROM appointments_tb a
    INNER JOIN branch_service_tb bs ON a.service_id = bs.branch_service_id
    LEFT JOIN pet_tb p ON a.pet_id = p.pet_id
    LEFT JOIN clinic_branches_tb cb ON a.branch_id = cb.branch_id
    WHERE a.appointment_id = ?"
  );
  $stmtInfo->execute([$data->appointment_id]);
  $appt = $stmtInfo->fetch();

  if (!$appt) throw new Exception("Appointment details not found.");

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
  $orderStmt->execute([$appt['user_id'], $data->branch_id, $orderStatus, $data->total]);
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

  // initialize medical record
  $medStmt = $pdo->prepare(
    "INSERT INTO medrecord_tb (
      pet_id, 
      appointment_id, 
      branch_id, 
      vet_id, 
      record_date, 
      service_name_at_time, 
      service_price_at_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  
  $medStmt->execute([
    $appt['pet_id'],
    $data->appointment_id,
    $data->branch_id,
    $appt['assigned_staff_id'],        
    $appt['start_time'],   
    $appt['custom_name'],  
    $appt['service_price']  
  ]);
  $medRecordId = $pdo->lastInsertId();

  // update appointment status
  $pdo->prepare("UPDATE appointments_tb SET status = ?, order_id = ? WHERE appointment_id = ?")
    ->execute([$appointmentStatus, $order_id, $data->appointment_id]);

  // get clinic for audit
  $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinic_branches_tb WHERE branch_id = ?");
  $stmtClinic->execute([$data->branch_id]);
  $clinicId = $stmtClinic->fetchColumn() ?: 0;

  // audit create order bill
  log_audit(
    $pdo, 
    $user->user_id, 
    $clinicId, 
    $data->branch_id, 
    'CREATE', 
    'BILLING_TRANSACTION', 
    $order_id
  );

  // audit medical record create
  log_audit(
    $pdo, 
    $user->user_id, 
    $clinicId, 
    $data->branch_id, 
    'CREATE', 
    'MEDICAL_RECORD', 
    $medRecordId
  );


  $petName = ucwords($appt['pet_name'] ?? 'pet name');
  $clinicName = ucwords($appt['clinic_name'] ?? 'the clinic');
  $formattedTotal = number_format($data->total, 2);

  if($is_card) {
    // Notification for online Payment
    $notifTitle = "Action Required: Pay Bill";
    $notifMessage = "Your bill of ₱{$formattedTotal} for {$petName}'s appointment at {$clinicName} is ready. Please go to activity to complete your payment.";
  } else {
    // Notification for Cash Payment
    $notifTitle = "Payment Received";
    $notifMessage = "Your cash payment of ₱{$formattedTotal} for {$petName}'s appointment at {$clinicName} has been successfully processed. Thank you!";
  }

  send_notification($pdo, $appt['user_id'], 'billing', $notifTitle, $notifMessage);

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