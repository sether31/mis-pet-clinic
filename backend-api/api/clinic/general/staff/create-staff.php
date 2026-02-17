<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';

$userToken = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

$data = $_POST;

if(empty($data)) {
  echo json_encode(["success" => false, "message" => "No data provided"]);
  exit;
}

$fname = $data['fname'] ?? '';
$lname = $data['lname'] ?? '';
$email = $data['email'] ?? '';
$role_id = $data['role_id'] ?? 5;
$branch_id = $data['branch_id'] ?? null;
$status = $data['status'] ?? 0;
$password = $data['password'] ?? ''; 

$permissionsArray = isset($data['permissions']) ? json_decode($data['permissions'], true) : [];
$permissionsJson = json_encode($permissionsArray);
$scheduleData = isset($data['schedule']) ? json_decode($data['schedule'], true) : [];

if(empty($fname) || empty($lname) || empty($email) || empty($branch_id) || empty($password)) {
  echo json_encode(["success" => false, "message" => "Missing required fields"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  // get clinic for audit
  $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinic_branches_tb WHERE branch_id = ?");
  $stmtClinic->execute([$branch_id]);
  $clinicId = $stmtClinic->fetchColumn() ?: 0;

  // check if email exists
  $checkEmail = $pdo->prepare("SELECT user_id FROM user_tb WHERE email = ? LIMIT 1");
  $checkEmail->execute([$email]);

  if($checkEmail->rowCount() > 0) {
    echo json_encode(["success" => false, "message" => "Email already registered"]);
    exit;
  }

  // insert user_tb
  $hashed_password = password_hash($password, PASSWORD_DEFAULT);
  $userStmt = $pdo->prepare(
    "INSERT INTO user_tb (first_name, last_name, email, password, role_id, status) 
    VALUES (:fname, :lname, :email, :password, :role_id, 'approved')"
  );
  $userStmt->execute([
    ':fname' => $fname,
    ':lname' => $lname,
    ':email' => $email,
    ':password' => $hashed_password,
    ':role_id' => $role_id
  ]);

  $user_id = $pdo->lastInsertId();

  // handle profile picture
  $profilePicPath = null;
  if(isset($_FILES['profile_pic']) && $_FILES['profile_pic']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['profile_pic'];
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = "staff_" . $user_id . "_" . time() . "." . $ext;
    
    $uploadDir = "../../../../uploads/profile_pics/";
    if(!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
    
    if(move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
      $profilePicPath = "uploads/profile_pics/" . $filename;
      $updatePic = $pdo->prepare("UPDATE user_tb SET profile_picture = ? WHERE user_id = ?");
      $updatePic->execute([$profilePicPath, $user_id]);
    }
  }
  
  // insert branch_staff_tb
  $staffStmt = $pdo->prepare(
    "INSERT INTO branch_staff_tb (user_id, branch_id, permissions) 
    VALUES (:user_id, :branch_id, :permissions)"
  );
  $staffStmt->execute([
    ':user_id' => $user_id,
    ':branch_id' => $branch_id,
    ':permissions' => $permissionsJson
  ]);

  // get staff id for staff sched
  $actual_staff_id = $pdo->lastInsertId();

  if(!empty($scheduleData)) {
    $schedStmt = $pdo->prepare(
      "INSERT INTO branch_staff_schedule_tb (staff_id, day_of_week, start_time, end_time, is_available) 
      VALUES (:staff_id, :day, :start, :end, :available)"
    );

    foreach ($scheduleData as $dayName => $times) {
    $schedStmt->execute([
        ':staff_id' => $actual_staff_id,
        ':day' => $dayName,
        ':start' => $times['start'],
        ':end' => $times['end'],
        ':available'=> $times['is_workday'] ? 1 : 0
      ]);
    }
  }

  log_audit(
    $pdo, 
    $userToken->user_id, 
    $clinicId, 
    $branch_id, 
    'CREATE', 
    'STAFF_MEMBER', 
    $user_id
  );

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Staff member created successfully."]);

} catch (Exception $e) {
  if($pdo && $pdo->inTransaction()) $pdo->rollBack();
  echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}