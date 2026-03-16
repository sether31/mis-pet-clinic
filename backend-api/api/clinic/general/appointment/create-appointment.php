<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';
require_once __DIR__ . '/../../../../helper/send_notification.php';

$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);

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

  // only check if limit is below 1000 
  if($limit > 0 && $limit < 1000) {
    // only count appointments created AFTER the current subscription started
    $capQuery = "SELECT COUNT(*) FROM appointments_tb 
                  WHERE branch_id = ? 
                  AND status NOT IN ('cancelled', 'rejected')
                  AND created_at >= ?";
    
    // Pass the start date into the query
    $capParams = [$branch_id, $sub_start_date];

    // ignore this specific ID in the count (Allows editing when at max capacity)
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
        "message" => "Subscription Limit Reached: This branch is limited to $limit appointments"
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

  if($appointment_id) {
    // update existing 
    $updateStmt = $pdo->prepare(
      "UPDATE appointments_tb SET 
        user_id = ?, pet_id = ?, service_id = ?, staff_id = ?, 
        branch_id = ?, start_time = ?, end_time = ?, status = 'confirmed',
        last_updated_by = ?
      WHERE appointment_id = ?"
    );
    $updateStmt->execute([
      $user_id, $pet_id, $service_id, $staff_id, 
      $branch_id, $start_time, $end_time, $user->user_id, 
      $appointment_id
    ]);
    $msg = "Appointment updated and confirmed.";
    $targetId = $appointment_id;
  } else {
    // insert new
    $insertStmt = $pdo->prepare(
      "INSERT INTO appointments_tb (
        user_id, pet_id, service_id, staff_id, branch_id, 
        start_time, end_time, status, created_at, last_updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', NOW(), ?)"
    );
    $insertStmt->execute([
      $user_id, $pet_id, $service_id, $staff_id, 
      $branch_id, $start_time, $end_time, $user->user_id
    ]);
    $targetId = $pdo->lastInsertId();
    $msg = "Appointment successfully scheduled.";
  }

  // get clinic for audit
  $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinic_branches_tb WHERE branch_id = ?");
  $stmtClinic->execute([$branch_id]);
  $clinicId = $stmtClinic->fetchColumn() ?: 0;

  $action = $appointment_id ? 'UPDATE' : 'CREATE';

  // audit create appointment
  log_audit(
    $pdo, 
    $user->user_id, 
    $clinicId, 
    $branch_id, 
    $action, 
    'APPOINTMENT', 
    $targetId
  );


  // 1. Fetch details to make the message readable
  $petName = $pdo->query("SELECT name FROM pet_tb WHERE pet_id = " . (int)$pet_id)->fetchColumn() ?: 'your pet';
  $serviceName = $pdo->query("SELECT custom_name FROM branch_service_tb WHERE branch_service_id = " . (int)$service_id)->fetchColumn() ?: 'Service';
  
  // Fetch the ASSIGNED STAFF'S name
  $stmtStaff = $pdo->prepare(
    "SELECT u.user_id, u.first_name, u.last_name, r.role_name 
    FROM branch_staff_tb s 
    JOIN user_tb u ON s.user_id = u.user_id 
    JOIN roles_tb r ON u.role_id = r.role_id
    WHERE s.staff_id = ?"
  );
  $stmtStaff->execute([$staff_id]);
  $staffData = $stmtStaff->fetch();

  $staffName = $staffData ? $staffData['first_name'] . ' ' . $staffData['last_name'] : 'a professional';
  $assignedStaffUserId = $staffData['user_id'] ?? null;
  $staffRole = strtolower($staffData['role_name'] ?? '');

  // Fetch the CREATOR'S name (The person logged in making the appointment)
  $stmtCreator = $pdo->prepare("SELECT first_name, last_name FROM user_tb WHERE user_id = ?");
  $stmtCreator->execute([$user->user_id]);
  $creatorData = $stmtCreator->fetch();
  $creatorName = $creatorData ? trim($creatorData['first_name'] . ' ' . $creatorData['last_name']) : 'Our staff';

  // 2. Format variables
  $prefix = ($staffRole === 'veterinarian') ? 'Dr. ' : '';
  $formattedDate = date('F j, Y', strtotime($start_time));
  $formattedTime = date('g:i A', strtotime($start_time));
  $notifTitle = $appointment_id ? "Appointment Updated" : "New Appointment Scheduled";
  
  $ownerMsg = "";

  // 3. Create the Custom Message based on WHO is making the appointment
  if ($assignedStaffUserId == $user->user_id) {
    // SCENARIO A: The staff member (Vet/Groomer) created it for themselves
    $ownerMsg = "{$prefix}{$staffName} has scheduled {$petName}'s {$serviceName} on {$formattedDate} at {$formattedTime}.";
  } else {
    // SCENARIO B: Someone else (Manager, Receptionist, Admin) created it for the Vet/Groomer
    $ownerMsg = "{$creatorName} has scheduled an appointment for {$petName}'s {$serviceName} on {$formattedDate} at {$formattedTime} with {$prefix}{$staffName}.";
  }

  // Send to Pet Owner
  send_notification($pdo, $user_id, 'appointment', $notifTitle, $ownerMsg);

  // 4. Notify the Staff Member ONLY IF someone else assigned this to them!
  if ($assignedStaffUserId && $assignedStaffUserId != $user->user_id) {
    $staffTitle = "New Appointment Assigned";
    $staffMsg = "You have been assigned a new {$serviceName} appointment for {$petName} on {$formattedDate} at {$formattedTime}. Assigned by: {$creatorName}.";
    send_notification($pdo, $assignedStaffUserId, 'appointment', $staffTitle, $staffMsg);
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