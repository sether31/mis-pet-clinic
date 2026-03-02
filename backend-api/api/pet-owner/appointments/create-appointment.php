<?php
ob_clean();
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../helper/log_audit.php';

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

  // Convert times
  $start_timestamp = strtotime("$date $time");
  $start_datetime = date('Y-m-d H:i:s', $start_timestamp);

  $stmtSrv = $pdo->prepare("SELECT duration FROM branch_service_tb WHERE branch_service_id = :id LIMIT 1");
  $stmtSrv->execute([':id' => $branch_service_id]);
  $service = $stmtSrv->fetch();
  $duration = $service ? (int)$service['duration'] : 30;

  $end_timestamp = $start_timestamp + ($duration * 60);
  $end_datetime = date('Y-m-d H:i:s', $end_timestamp);

  // start
  $pdo->beginTransaction();

  // Check Branch Subscription Limit (Based on Subscription Date & Active Status)
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

  // Only check if limit is below 1000 
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
    throw new Exception("This time slot was just booked.");
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

  log_audit(
    $pdo, 
    $user_id, 
    $clinicId, 
    $branch_id, 
    'CREATE', 
    'APPOINTMENT', 
    $targetId
  );

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Appointment requested successfully!"]);

} catch (Throwable $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>