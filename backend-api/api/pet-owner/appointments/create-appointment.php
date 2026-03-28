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

  if (!isset($data['branch_id'], $data['branch_service_id'], $data['pet_id'], $data['staff_id'], $data['appointment_date'], $data['appointment_time'])) {
    throw new Exception("Missing required booking information.");
  }

  $branch_id = $data['branch_id'];
  $branch_service_id = $data['branch_service_id'];
  $pet_id = $data['pet_id'];
  $staff_id = $data['staff_id'];
  $date = $data['appointment_date'];
  $time = $data['appointment_time'];

  // CLINIC & SERVICE CHECK (Maintenance, Status, Expiry, & Service Availability)
    $checkStmt = $pdo->prepare(
        "SELECT 
          cb.is_maintenance, 
          cb.status AS branch_status, 
          bsrv.status AS service_active, -- Fetch the specific service status
          (SELECT COUNT(*) FROM branch_subscriptions_tb bs 
            WHERE bs.branch_id = cb.branch_id 
              AND LOWER(bs.status) = 'active' 
              AND bs.end_date >= CURDATE()
          ) as has_sub
        FROM clinic_branches_tb cb 
        JOIN branch_service_tb bsrv ON cb.branch_id = bsrv.branch_id
        WHERE cb.branch_id = ? AND bsrv.branch_service_id = ?"
    );
    
    $checkStmt->execute([$branch_id, $branch_service_id]);
    $check = $checkStmt->fetch();
    
    // 1. Check if Branch/Clinic is valid
    if (
        !$check || 
        strtolower($check['branch_status']) !== 'approved' || 
        $check['is_maintenance'] == 1 || 
        $check['has_sub'] == 0
    ) {
        throw new Exception("This clinic is currently under maintenance or unavailable.");
    }
    
    // 2. Check if the specific Service is valid (Fixes your specific error)
    if ($check['service_active'] == 0) {
        throw new Exception("This service is currently unavailable.");
    }

  // Convert times
  $start_timestamp = strtotime("$date $time");
  $start_datetime = date('Y-m-d H:i:s', $start_timestamp);

  $stmtSrv = $pdo->prepare("SELECT duration FROM branch_service_tb WHERE branch_service_id = :id LIMIT 1");
  $stmtSrv->execute([':id' => $branch_service_id]);
  $service = $stmtSrv->fetch();
  $duration = $service ? (int)$service['duration'] : 30;

  $end_timestamp = $start_timestamp + ($duration * 60);
  $end_datetime = date('Y-m-d H:i:s', $end_timestamp);

  $pdo->beginTransaction();

  // Check Branch Subscription Limit
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

    if($currentCount >= $limit) {
      throw new Exception("This clinic has reached its maximum appointment limit.");
    }
  }

  // Safety Check for time slot conflicts
  $stmtCheck = $pdo->prepare(
    "SELECT appointment_id FROM appointments_tb 
    WHERE staff_id = :staff_id 
    AND status NOT IN ('cancelled', 'rejected')
    AND (start_time < :end AND end_time > :start) 
    LIMIT 1"
  );
  $stmtCheck->execute([':staff_id' => $staff_id, ':start' => $start_datetime, ':end' => $end_datetime]);

  if($stmtCheck->fetch()) {
    throw new Exception("This time slot was just booked. Please select another time.");
  }

  $stmtInsert = $pdo->prepare(
    "INSERT INTO appointments_tb 
    (user_id, pet_id, branch_id, service_id, staff_id, start_time, end_time, status) 
    VALUES 
    (:uid, :pid, :bid, :bsid, :sid, :start, :end, 'pending')"
  );

  $stmtInsert->execute([
    ':uid' => $user_id,
    ':pid' => $pet_id,
    ':bid' => $branch_id,
    ':bsid' => $branch_service_id,
    ':sid' => $staff_id,
    ':start' => $start_datetime,
    ':end' => $end_datetime
  ]);

  $targetId = $pdo->lastInsertId();

  // AUDIT LOG
  $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinic_branches_tb WHERE branch_id = ?");
  $stmtClinic->execute([$branch_id]);
  $clinicId = $stmtClinic->fetchColumn() ?: 0;

  log_audit($pdo, $user_id, $clinicId, $branch_id, 'CREATE', 'APPOINTMENT', $targetId);


  // --- ADDED: SEND NOTIFICATION TO THE ASSIGNED STAFF ---
  // Get Pet Name for the message
  $petStmt = $pdo->prepare("SELECT name FROM pet_tb WHERE pet_id = ?");
  $petStmt->execute([$pet_id]);
  $petName = $petStmt->fetchColumn() ?: 'A pet';
  
  $formattedTime = date('M j \a\t g:i A', $start_timestamp);
  $notifTitle = "New Appointment Request";
  $notifMessage = "A new booking request for {$petName} on {$formattedTime}.";

  // Get the user_id of the assigned staff member
  $staffUserStmt = $pdo->prepare("SELECT user_id FROM branch_staff_tb WHERE staff_id = ? LIMIT 1");
  $staffUserStmt->execute([$staff_id]);
  $assignedUserId = $staffUserStmt->fetchColumn();

  if ($assignedUserId) {
    send_notification($pdo, $assignedUserId, 'appointment', $notifTitle, $notifMessage);
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