<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';
require_once __DIR__ . '/../../../../helper/send_notification.php';

$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);
$actorId = $user->user_id;

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
      branch_id, order_id, amount, payment_method, payment_status, payment_type
    ) VALUES (?, ?, ?, ?, ?, 'appointment')"
  );
  $payStmt->execute([$data->branch_id, $order_id, $data->total, $finalMethod, $paymentStatus]);

  // process order items
  $itemStmt = $pdo->prepare("INSERT INTO order_items_tb (order_id, product_id, service_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?)");
  // update inventory
  $invUpdate = $pdo->prepare("UPDATE inventory_tb SET stock_level = stock_level - ? WHERE product_id = ? AND branch_id = ?");

  foreach($data->items as $item) {
    $subtotal = $item->qty * $item->price;
    $p_id = ($item->type === 'product') ? ($item->product_id ?? null) : null;
    $s_id = ($item->type === 'service') ? ($item->service_id ?? null) : null;

    $itemStmt->execute([$order_id, $p_id, $s_id, $item->qty, $item->price, $subtotal]);

    if($item->type === 'product' && !empty($p_id)) {
      $invUpdate->execute([$item->qty, $p_id, $data->branch_id]);
    }
  }

  // initialize medical record
  $medStmt = $pdo->prepare(
    "INSERT INTO medrecord_tb (
      pet_id, appointment_id, branch_id, vet_id, record_date, service_name_at_time, service_price_at_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  $medStmt->execute([
    $appt['pet_id'], $data->appointment_id, $data->branch_id, $appt['assigned_staff_id'],        
    $appt['start_time'], $appt['custom_name'], $appt['service_price']  
  ]);
  $medRecordId = $pdo->lastInsertId();

  // update appointment status
  $pdo->prepare(
    "UPDATE appointments_tb 
    SET status = ?, 
      order_id = ?, 
      last_updated_by = ? 
    WHERE appointment_id = ?"
  )->execute([$appointmentStatus, $order_id, $actorId, $data->appointment_id]);

  // get clinic for audit
  $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinic_branches_tb WHERE branch_id = ?");
  $stmtClinic->execute([$data->branch_id]);
  $clinicId = $stmtClinic->fetchColumn() ?: 0;

  // audit create order bill
  log_audit($pdo, $actorId, $clinicId, $data->branch_id, 'CREATE', 'BILLING_TRANSACTION', $order_id);
  // audit medical record create
  log_audit($pdo, $actorId, $clinicId, $data->branch_id, 'CREATE', 'MEDICAL_RECORD', $medRecordId);

  // --- 🔔 SMART NOTIFICATION LOGIC ---
  $petName = ucwords($appt['pet_name'] ?? 'your pet');
  $formattedTotal = number_format($data->total, 2);
  $serviceName = $appt['custom_name'] ?? 'service';
  $notifiedUsers = []; 

  // 1. Fetch Actor's Name AND Role Name
  $actorStmt = $pdo->prepare("
      SELECT u.first_name, u.last_name, r.role_name 
      FROM user_tb u
      JOIN roles_tb r ON u.role_id = r.role_id
      WHERE u.user_id = ? LIMIT 1
  ");
  $actorStmt->execute([$actorId]);
  $actor = $actorStmt->fetch(PDO::FETCH_ASSOC);

  $actorName = $actor ? trim($actor['first_name'] . ' ' . $actor['last_name']) : 'Staff';
  // Format Role (e.g., 'clinic_admin' -> 'Clinic Admin')
  $actorRole = $actor ? ucwords(str_replace('_', ' ', $actor['role_name'])) : 'Staff';

  // Combined Actor String: "Clinic Admin (Seth Hernandez)"
  $actorDisplay = "{$actorRole} ({$actorName})";

  if($is_card) {
      // --- CASE: CARD ---
      $custTitle = "Action Required: Pay Bill";
      $custMsg = "Your bill of ₱{$formattedTotal} for {$petName} is ready. Please pay via the app activity.";
      send_notification($pdo, $appt['user_id'], 'billing', $custTitle, $custMsg);

      $sharedInternalMsg = "Bill for {$petName}'s {$serviceName} (₱{$formattedTotal}) has been sent by {$actorName}.";

      // 1. Notify Staff ONLY (Branch Admin is excluded here)
      $staffStmt = $pdo->prepare("
          SELECT bs.user_id FROM branch_staff_tb bs
          JOIN user_tb u ON bs.user_id = u.user_id
          JOIN roles_tb r ON u.role_id = r.role_id
          WHERE bs.branch_id = ? AND r.role_name = 'staff' AND bs.status = 1
      ");
      $staffStmt->execute([$data->branch_id]);
      foreach ($staffStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
          $uid = $row['user_id'];
          if (!empty($uid)) {
              send_notification($pdo, $uid, 'billing', "Appointment Completed", $sharedInternalMsg);
              $notifiedUsers[] = $uid;
          }
      }

      // 2. Notify Specific Vet
      if (!empty($appt['assigned_staff_id'])) {
          $vetStmt = $pdo->prepare("SELECT user_id FROM branch_staff_tb WHERE staff_id = ? AND status = 1 LIMIT 1");
          $vetStmt->execute([$appt['assigned_staff_id']]);
          $vetUserId = $vetStmt->fetchColumn();

          if ($vetUserId && !in_array($vetUserId, $notifiedUsers)) {
              send_notification($pdo, $vetUserId, 'billing', "Bill Generated", $sharedInternalMsg);
              $notifiedUsers[] = $vetUserId;
          }
      }

  } else {
      // --- CASE: CASH ---
      $custTitle = "Payment Received";
      $custMsg = "Your cash payment of ₱{$formattedTotal} for {$petName} has been processed. Thank you!";
      send_notification($pdo, $appt['user_id'], 'billing', $custTitle, $custMsg);

      $sharedInternalMsg = "Cash payment of ₱{$formattedTotal} for {$petName}'s {$serviceName} received by {$actorDisplay}.";

      // 1. Notify Staff AND Branch Admin
      $staffStmt = $pdo->prepare("
          SELECT bs.user_id FROM branch_staff_tb bs
          JOIN user_tb u ON bs.user_id = u.user_id
          JOIN roles_tb r ON u.role_id = r.role_id
          WHERE bs.branch_id = ? AND r.role_name IN ('staff', 'branch_admin') AND bs.status = 1
      ");
      $staffStmt->execute([$data->branch_id]);
      foreach ($staffStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
          $uid = $row['user_id'];
          if (!empty($uid)) {
              send_notification($pdo, $uid, 'billing', "Cash Payment Settled", $sharedInternalMsg);
              $notifiedUsers[] = $uid;
          }
      }

      // 2. Notify Specific Vet
      if (!empty($appt['assigned_staff_id'])) {
          $vetStmt = $pdo->prepare("SELECT user_id FROM branch_staff_tb WHERE staff_id = ? AND status = 1 LIMIT 1");
          $vetStmt->execute([$appt['assigned_staff_id']]);
          $vetUserId = $vetStmt->fetchColumn();

          if ($vetUserId && !in_array($vetUserId, $notifiedUsers)) {
              send_notification($pdo, $vetUserId, 'billing', "Appointment Completed", $sharedInternalMsg);
          }
      }
  }

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
?>