<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);
header("Content-Type: application/json");

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents("php://input"), true);

  if (!$data) throw new Exception("Invalid request data.");

  // get data
  $appointment_id = $data['appointment_id'] ?? null; 
  $branch_id = $data['branch_id'] ?? null;
  $staff_id = $data['staff_id'] ?? null;
  $user_id = $data['user_id'] ?? null;
  $pet_id = $data['pet_id'] ?? null;
  $service_id = $data['service_id'] ?? null;
  $start_time = $data['start_time'] ?? null; 
  $end_time = $data['end_time'] ?? null;

  if(!$staff_id || !$user_id || !$pet_id || !$start_time || !$end_time || !$branch_id) {
    throw new Exception("Missing required fields.");
  }

  // check appointment limit
  $limitStmt = $pdo->prepare(
    "SELECT s.appointment_limit 
    FROM branch_subscriptions_tb bs
    JOIN subscriptions_tb s ON bs.subscription_id = s.subscription_id
    WHERE bs.branch_id = ? AND bs.status = 'active'
    LIMIT 1"
  );
  $limitStmt->execute([$branch_id]);
  $subData = $limitStmt->fetch();
  
  $limit = $subData ? (int)$subData['appointment_limit'] : 0;

  // only check if limit is below 1000 
  if($limit < 1000) {
    $capQuery = "SELECT COUNT(*) FROM appointments_tb 
                  WHERE branch_id = ? 
                  AND status NOT IN ('cancelled', 'rejected')";
    
    $capParams = [$branch_id];

    // Self-Exclusion: If updating (approving), ignore this specific ID in the count
    if($appointment_id) {
      $capQuery .= " AND appointment_id != ?";
      $capParams[] = $appointment_id;
    }

    $capStmt = $pdo->prepare($capQuery);
    $capStmt->execute($capParams);
    $currentCount = (int)$capStmt->fetchColumn();

    if($currentCount >= $limit) {
      echo json_encode([
        "success" => false, 
        "message" => "Subscription Limit Reached: This branch is limited to $limit active appointments."
      ]);
      exit;
    }
  }

  // user and pet validation
  $checkStmt = $pdo->prepare(
    "SELECT 
    (SELECT COUNT(*) FROM user_tb WHERE user_id = :uid) as user_exists,
    (SELECT COUNT(*) FROM pet_tb WHERE pet_id = :pid AND owner_id = :uid) as pet_belongs"
  );
  
  $checkStmt->execute([':uid' => $user_id, ':pid' => $pet_id]);
  $validation = $checkStmt->fetch();

  if((int)$validation['user_exists'] === 0) {
    echo json_encode(["success" => false, "message" => "User Not Found: ID #$user_id does not exist."]);
    exit;
  }

  if((int)$validation['pet_belongs'] === 0) {
    echo json_encode(["success" => false, "message" => "Ownership Error: Pet ID #$pet_id does not belong to User #$user_id."]);
    exit;
  }

  // check if have conflict
  $overlapQuery = "SELECT appointment_id FROM appointments_tb 
                    WHERE staff_id = ? 
                    AND status NOT IN ('cancelled', 'rejected')";
  
  $params = [$staff_id];

  if ($appointment_id) {
    $overlapQuery .= " AND appointment_id != ?";
    $params[] = $appointment_id;
  }

  $overlapQuery .= " AND (start_time < ? AND end_time > ?) LIMIT 1";
  $params[] = $end_time;
  $params[] = $start_time;

  $overlapStmt = $pdo->prepare($overlapQuery);
  $overlapStmt->execute($params);
  
  if($overlapStmt->fetch()) {
    echo json_encode(["success" => false, "message" => "Time Conflict: Staff is already booked for this slot."]);
    exit;
  }

  $pdo->beginTransaction();

  if ($appointment_id) {
    // update existing 
    $updateStmt = $pdo->prepare(
      "UPDATE appointments_tb SET 
        user_id = ?, pet_id = ?, service_id = ?, staff_id = ?, 
        branch_id = ?, start_time = ?, end_time = ?, status = 'confirmed'
      WHERE appointment_id = ?"
    );
    $updateStmt->execute([
      $user_id, $pet_id, $service_id, $staff_id, 
      $branch_id, $start_time, $end_time, $appointment_id
    ]);
    $msg = "Appointment updated and confirmed.";
  } else {
    // insert new
  $insertStmt = $pdo->prepare(
      "INSERT INTO appointments_tb (
        user_id, pet_id, service_id, staff_id, branch_id, 
        start_time, end_time, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', NOW())"
    );
    $insertStmt->execute([
      $user_id, $pet_id, $service_id, $staff_id, 
      $branch_id, $start_time, $end_time
    ]);
    $msg = "Appointment successfully scheduled.";
  }

  $pdo->commit();
  echo json_encode(["success" => true, "message" => $msg]);

} catch (PDOException $sqlError) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  error_log($sqlError->getMessage());
  echo json_encode(["success" => false, "message" => "Database Error: " . $sqlError->getMessage()]);
} catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}