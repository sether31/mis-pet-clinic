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

  // 1. Get Owner & Appointment Details (Removed direct JOIN to branch_service_tb due to comma-separated IDs)
  $stmtInfo = $pdo->prepare(
    "SELECT 
      a.user_id, a.pet_id, a.start_time, a.staff_id as assigned_staff_id,
      a.order_id, a.service_id as service_ids,
      p.name as pet_name, cb.name as clinic_name
    FROM appointments_tb a
    LEFT JOIN pet_tb p ON a.pet_id = p.pet_id
    LEFT JOIN clinic_branches_tb cb ON a.branch_id = cb.branch_id
    WHERE a.appointment_id = ?"
  );
  $stmtInfo->execute([$data->appointment_id]);
  $appt = $stmtInfo->fetch();

  if (!$appt) throw new Exception("Appointment details not found.");
  if (empty($appt['order_id'])) throw new Exception("No existing order found for this appointment.");

  $order_id = $appt['order_id']; // Target the existing order!

  $is_card = (strtolower($data->payment_method ?? '') === 'card');
  
  $appointmentStatus = $is_card ? 'billed' : 'completed';
  $orderStatus = $is_card ? 'pending' : 'completed';
  $paymentStatus = $is_card ? 'unpaid' : 'paid';
  $finalMethod = $is_card ? null : 'cash';

  $cashReceived = !$is_card ? ($data->cash_received ?? 0) : null;
  $cashChange = !$is_card ? ($data->cash_change ?? 0) : null;

  // 2. UPDATE the existing order (Do NOT create a new one)
  $orderStmt = $pdo->prepare("UPDATE order_tb SET order_status = ?, total_amount = ? WHERE order_id = ?");
  $orderStmt->execute([$orderStatus, $data->total, $order_id]);

  // 3. Create payment record linked to the EXISTING order
  $payStmt = $pdo->prepare(
    "INSERT INTO payments_tb (
      branch_id, order_id, amount, cash_received, cash_change, 
      payment_method, payment_status, payment_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'appointment')"
  );
  $payStmt->execute([
    $data->branch_id, $order_id, $data->total, $cashReceived, 
    $cashChange, $finalMethod, $paymentStatus
  ]);

  // 4. Process Order Items Safely (Check existence so we don't delete original services or duplicate them)
  $checkProduct = $pdo->prepare("SELECT order_item_id FROM order_items_tb WHERE order_id = ? AND inventory_id = ?");
    $checkService = $pdo->prepare("SELECT order_item_id FROM order_items_tb WHERE order_id = ? AND service_id = ?");
    
    // Updated: Added product_id as the 4th column
    $insertItem = $pdo->prepare("INSERT INTO order_items_tb (order_id, inventory_id, service_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $updateItem = $pdo->prepare("UPDATE order_items_tb SET quantity = ?, price = ?, subtotal = ? WHERE order_item_id = ?");
    $invUpdate  = $pdo->prepare("UPDATE inventory_tb SET stock_level = stock_level - ? WHERE inventory_id = ? AND branch_id = ?");

    foreach($data->items as $item) {
        $subtotal = $item->qty * $item->price;
        $foundItemId = null;

        if ($item->type === 'product') {
          $inv_id = $item->inventory_id ?? $item->product_id ?? null; 
          
          // Check if product_id exists separately if your frontend sends it differently
          $prod_id = $item->product_id ?? null; 

          $checkProduct->execute([$order_id, $inv_id]);
          $foundItemId = $checkProduct->fetchColumn();

          if ($foundItemId) {
              $updateItem->execute([$item->qty, $item->price, $subtotal, $foundItemId]);
          } else {
              // Updated: Passing $inv_id for inventory AND $prod_id for the product_id column
              $insertItem->execute([$order_id, $inv_id, null, $prod_id, $item->qty, $item->price, $subtotal]);
              $invUpdate->execute([$item->qty, $inv_id, $data->branch_id]);
          }
      } else if ($item->type === 'service') {
            // Fix: Check if the service_id is actually provided, otherwise skip to prevent NULL inserts
            $s_id = $item->service_id ?? null;
            if (!$s_id) continue; 

            $checkService->execute([$order_id, $s_id]);
            $foundItemId = $checkService->fetchColumn();

            if ($foundItemId) {
                // Just update price/qty of existing service from the appointment
                $updateItem->execute([$item->qty, $item->price, $subtotal, $foundItemId]);
            } else {
                // Only insert if it's a NEW service added at the clinic that wasn't in the original booking
                $insertItem->execute([$order_id, null, $s_id, $item->qty, $item->price, $subtotal]);
            }
        }
    }

  // 5. Fetch Service details properly for Medical Record & Notifications
  $serviceIdsArray = explode(',', $appt['service_ids']);
  $placeholders = implode(',', array_fill(0, count($serviceIdsArray), '?'));
  $srvStmt = $pdo->prepare("SELECT custom_name, price FROM branch_service_tb WHERE branch_service_id IN ($placeholders)");
  $srvStmt->execute($serviceIdsArray);
  $servicesData = $srvStmt->fetchAll(PDO::FETCH_ASSOC);

  $serviceNames = [];
  $serviceTotalPrice = 0;
  foreach ($servicesData as $srv) {
      $serviceNames[] = $srv['custom_name'];
      $serviceTotalPrice += (float)$srv['price'];
  }
  $combinedServiceNames = implode(', ', $serviceNames);

  // 6. Initialize medical record
  $medStmt = $pdo->prepare(
    "INSERT INTO medrecord_tb (
      pet_id, appointment_id, branch_id, vet_id, record_date, service_name_at_time, service_price_at_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  $medStmt->execute([
    $appt['pet_id'], $data->appointment_id, $data->branch_id, $appt['assigned_staff_id'],        
    $appt['start_time'], $combinedServiceNames, $serviceTotalPrice  
  ]);
  $medRecordId = $pdo->lastInsertId();

  // 7. Update appointment status
  $pdo->prepare(
    "UPDATE appointments_tb 
    SET status = ?, 
        last_updated_by = ? 
    WHERE appointment_id = ?"
  )->execute([$appointmentStatus, $actorId, $data->appointment_id]);

  // get clinic for audit
  $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinic_branches_tb WHERE branch_id = ?");
  $stmtClinic->execute([$data->branch_id]);
  $clinicId = $stmtClinic->fetchColumn() ?: 0;

  // audits
  log_audit($pdo, $actorId, $clinicId, $data->branch_id, 'UPDATE', 'BILLING_TRANSACTION', $order_id);
  log_audit($pdo, $actorId, $clinicId, $data->branch_id, 'CREATE', 'MEDICAL_RECORD', $medRecordId);

  // --- 🔔 SMART NOTIFICATION LOGIC ---
  $petName = ucwords($appt['pet_name'] ?? 'your pet');
  $formattedTotal = number_format($data->total, 2);
  $serviceName = !empty($combinedServiceNames) ? $combinedServiceNames : 'service';
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
  $actorRole = $actor ? ucwords(str_replace('_', ' ', $actor['role_name'])) : 'Staff';
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