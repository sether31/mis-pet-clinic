<?php
ob_clean();
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../helper/log_audit.php';
require_once __DIR__ . '/../../../helper/send_notification.php';

$decoded = validate_auth(['pet_owner']); 
$user_id = $decoded->user_id; 

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents("php://input"), true);

  // 1. UPDATE: We now check for 'service_ids' (array) instead of 'branch_service_id'
  if (!isset($data['branch_id'], $data['service_ids'], $data['pet_id'], $data['staff_id'], $data['appointment_date'], $data['appointment_time']) || !is_array($data['service_ids'])) {
      throw new Exception("Missing required booking information.");
  }

  $branch_id = $data['branch_id'];
  $service_ids = $data['service_ids']; // Array of IDs e.g., [1, 2, 3]
  $pet_id = $data['pet_id'];
  $staff_id = $data['staff_id'];
  $date = $data['appointment_date'];
  $time = $data['appointment_time'];

  // --- CLINIC CHECK (Maintenance, Status, Sub Expiry) ---
  $checkStmt = $pdo->prepare(
      "SELECT 
        is_maintenance, 
        status AS branch_status, 
        (SELECT COUNT(*) FROM branch_subscriptions_tb bs 
          WHERE bs.branch_id = clinic_branches_tb.branch_id 
            AND LOWER(bs.status) = 'active' 
            AND bs.end_date >= CURDATE()
        ) as has_sub
      FROM clinic_branches_tb 
      WHERE branch_id = ?"
  );
  $checkStmt->execute([$branch_id]);
  $check = $checkStmt->fetch();
  
  if (!$check || strtolower($check['branch_status']) !== 'approved' || $check['is_maintenance'] == 1 || $check['has_sub'] == 0) {
      throw new Exception("This clinic is currently under maintenance or unavailable.");
  }

  // --- SERVICES FETCH & VALIDATION ---
  // Fetch all selected services to check availability, calculate total time, and total amount
  $placeholders = implode(',', array_fill(0, count($service_ids), '?'));
  $stmtSrv = $pdo->prepare("SELECT branch_service_id, custom_name, price, duration, status FROM branch_service_tb WHERE branch_service_id IN ($placeholders) AND branch_id = ?");
  
  // Bind service IDs + branch ID
  $params = $service_ids;
  $params[] = $branch_id;
  $stmtSrv->execute($params);
  $servicesData = $stmtSrv->fetchAll(PDO::FETCH_ASSOC);

  if (count($servicesData) !== count($service_ids)) {
      throw new Exception("One or more selected services are invalid or do not belong to this clinic.");
  }

  $total_duration = 0;
  $total_amount = 0;
  $service_names = []; // Used for the notification

  foreach ($servicesData as $srv) {
      if ($srv['status'] == 0) {
          throw new Exception("The service '{$srv['custom_name']}' is currently unavailable.");
      }
      $total_duration += (int)$srv['duration'];
      $total_amount += (float)$srv['price'];
      $service_names[] = $srv['custom_name'];
  }

  $service_names_str = implode(', ', $service_names); // e.g., "Full Grooming, Anti-Tick Treatment"

  // --- TIME CALCULATION ---
  $start_timestamp = strtotime("$date $time");
  $start_datetime = date('Y-m-d H:i:s', $start_timestamp);
  $end_timestamp = $start_timestamp + ($total_duration * 60);
  $end_datetime = date('Y-m-d H:i:s', $end_timestamp);

  $pdo->beginTransaction();

  // --- CHECK BRANCH APPOINTMENT LIMIT ---
  $limitStmt = $pdo->prepare(
      "SELECT s.appointment_limit, bs.created_at as sub_start_date
      FROM branch_subscriptions_tb bs
      JOIN subscription_tb s ON bs.subscription_id = s.subscription_id
      WHERE bs.branch_id = ? AND bs.status = 'active'
      ORDER BY bs.created_at DESC LIMIT 1"
  );
  $limitStmt->execute([$branch_id]);
  $subData = $limitStmt->fetch();

  $limit = $subData ? (int)$subData['appointment_limit'] : 0;
  $sub_start_date = $subData ? $subData['sub_start_date'] : '2000-01-01 00:00:00';

  if ($limit > 0 && $limit < 1000) {
      $capStmt = $pdo->prepare(
          "SELECT COUNT(*) FROM appointments_tb 
          WHERE branch_id = ? 
          AND status NOT IN ('cancelled', 'rejected') 
          AND created_at >= ?"
      );
      $capStmt->execute([$branch_id, $sub_start_date]);
      $currentCount = (int)$capStmt->fetchColumn();

      if ($currentCount >= $limit) {
          throw new Exception("This clinic has reached its maximum appointment limit.");
      }
  }

  // --- CONFLICT CHECK ---
  $stmtCheck = $pdo->prepare(
      "SELECT appointment_id FROM appointments_tb 
      WHERE staff_id = :staff_id 
      AND status NOT IN ('cancelled', 'rejected')
      AND (start_time < :end AND end_time > :start) 
      LIMIT 1"
  );
  $stmtCheck->execute([':staff_id' => $staff_id, ':start' => $start_datetime, ':end' => $end_datetime]);

  if ($stmtCheck->fetch()) {
      throw new Exception("This time slot is no longer available for the total duration required.");
  }

  // --- 1. INSERT ORDER ---
  // Note: Assuming 'total amount' in your schema reference was a typo and is actually 'total_amount'
  $stmtOrder = $pdo->prepare("INSERT INTO order_tb (user_id, branch_id, order_status, total_amount) VALUES (?, ?, 'pending', ?)");
  $stmtOrder->execute([$user_id, $branch_id, $total_amount]);
  $order_id = $pdo->lastInsertId();

  // --- 2. INSERT APPOINTMENT ---
  $service_list = implode(',', $service_ids); // Save IDs as comma-separated string
  $stmtAppt = $pdo->prepare(
      "INSERT INTO appointments_tb 
      (user_id, pet_id, branch_id, service_id, staff_id, start_time, end_time, status, order_id) 
      VALUES 
      (:uid, :pid, :bid, :bsid, :sid, :start, :end, 'pending', :oid)"
  );

  $stmtAppt->execute([
      ':uid' => $user_id,
      ':pid' => $pet_id,
      ':bid' => $branch_id,
      ':bsid' => $service_list,
      ':sid' => $staff_id,
      ':start' => $start_datetime,
      ':end' => $end_datetime,
      ':oid' => $order_id
  ]);

  $appointment_id = $pdo->lastInsertId();

  // --- 3. INSERT ORDER ITEMS ---
  $stmtItem = $pdo->prepare("INSERT INTO order_items_tb (order_id, service_id, quantity, price, subtotal) VALUES (?, ?, 1, ?, ?)");
  foreach ($servicesData as $srv) {
      $stmtItem->execute([
          $order_id, 
          $srv['branch_service_id'], 
          $srv['price'], 
          $srv['price']
      ]);
  }

  // --- AUDIT LOG ---
  $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinic_branches_tb WHERE branch_id = ?");
  $stmtClinic->execute([$branch_id]);
  $clinicId = $stmtClinic->fetchColumn() ?: 0;

  log_audit($pdo, $user_id, $clinicId, $branch_id, 'CREATE', 'APPOINTMENT', $appointment_id);

  // --- FINALIZED: NOTIFY ASSIGNED STAFF & GENERAL STAFF ---
  
  // 1. Fetch Pet Name
  $petStmt = $pdo->prepare("SELECT name FROM pet_tb WHERE pet_id = ?");
  $petStmt->execute([$pet_id]);
  $petName = $petStmt->fetchColumn() ?: 'a pet';
  
  // 2. Fetch Staff Name & User ID
  $staffDataStmt = $pdo->prepare("
      SELECT u.first_name, u.last_name, bs.user_id 
      FROM branch_staff_tb bs
      JOIN user_tb u ON bs.user_id = u.user_id
      WHERE bs.staff_id = ? LIMIT 1
  ");
  $staffDataStmt->execute([$staff_id]);
  $staffRow = $staffDataStmt->fetch(PDO::FETCH_ASSOC);
  
  $staffName = $staffRow ? $staffRow['first_name'] . ' ' . $staffRow['last_name'] : 'Staff';
  $assignedUserId = $staffRow['user_id'] ?? null;

  // 3. Format Date and Time Range (Fixed the subtraction bug)
  $displayDate = date('M j, Y', $start_timestamp);
  $displayTime = date('g:i A', $start_timestamp) . " - " . date('g:i A', $end_timestamp);
  
  $notifTitle = "New Appointment Request";
  
  // 4. Construct the detailed message
  $notifMessage = "New booking for {$petName} on {$displayDate} ({$displayTime}). " .
                  "Assigned Professional: {$staffName}. " .
                  "Services: {$service_names_str}.";

  $notifiedUsers = [];

  // Notify the SPECIFICALLY ASSIGNED staff member
  if ($assignedUserId) {
      send_notification($pdo, $assignedUserId, 'appointment', $notifTitle, $notifMessage);
      $notifiedUsers[] = $assignedUserId;
  }
  
  // Notify ALL General Staff (role: 'staff')
  $stmtStaff = $pdo->prepare("
      SELECT bs.user_id 
      FROM branch_staff_tb bs
      JOIN user_tb u ON bs.user_id = u.user_id
      JOIN roles_tb r ON u.role_id = r.role_id
      WHERE bs.branch_id = ? AND bs.status = 1 
      AND r.role_name = 'staff'
  ");
  $stmtStaff->execute([$branch_id]);
  $generalStaff = $stmtStaff->fetchAll(PDO::FETCH_ASSOC);

  foreach ($generalStaff as $s) {
      $staffUserId = $s['user_id'];
      
      // Avoid sending duplicate notifications if the assigned staff is also 'general staff'
      if (!in_array($staffUserId, $notifiedUsers)) {
          send_notification($pdo, $staffUserId, 'appointment', $notifTitle, $notifMessage);
          $notifiedUsers[] = $staffUserId;
      }
  }

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Appointment requested successfully!"]);

} catch (Throwable $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  
  $msg = $e->getMessage();
  $isUnavailable = (strpos($msg, 'unavailable') !== false || strpos($msg, 'maintenance') !== false);
  
  http_response_code(400);
  echo json_encode([
      "success" => false, 
      "message" => $msg,
      "is_unavailable" => $isUnavailable 
  ]);
}
?>