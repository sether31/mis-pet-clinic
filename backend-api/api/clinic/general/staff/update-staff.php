<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

$data = $_POST;
$user_id = $data['user_id'] ?? null;

if(!$user_id) {
  echo json_encode(["success" => false, "message" => "User ID is required for updates"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  $userSql = "UPDATE user_tb SET first_name = :fname, last_name = :lname, email = :email, role_id = :role_id";
  $params = [
    ':fname'   => $data['fname'],
    ':lname'   => $data['lname'],
    ':email'   => $data['email'],
    ':role_id' => $data['role_id'],
    ':user_id' => $user_id
  ];

  if(!empty($data['password'])) {
    $userSql .= ", password = :password";
    $params[':password'] = password_hash($data['password'], PASSWORD_DEFAULT);
  }

  $userSql .= " WHERE user_id = :user_id";
  $userStmt = $pdo->prepare($userSql);
  $userStmt->execute($params);

  // handle update image and delete
  if(isset($_FILES['profile_pic']) && $_FILES['profile_pic']['error'] === UPLOAD_ERR_OK) {
    $oldImgStmt = $pdo->prepare("SELECT profile_picture FROM user_tb WHERE user_id = ?");
    $oldImgStmt->execute([$user_id]);
    $oldImagePath = $oldImgStmt->fetchColumn();

    $file = $_FILES['profile_pic'];
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = "staff_" . $user_id . "_" . time() . "." . $ext;
    $uploadDir = "../../../../uploads/profile_pics/";
    
    if(move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
      if($oldImagePath) {
        $fullOldPath = __DIR__ . '/../../../../' . $oldImagePath;
        if(file_exists($fullOldPath)) {
          unlink($fullOldPath); 
        }
      }

      $profilePicPath = "uploads/profile_pics/" . $filename;
      $updatePic = $pdo->prepare("UPDATE user_tb SET profile_picture = ? WHERE user_id = ?");
      $updatePic->execute([$profilePicPath, $user_id]);
    }
  }

  // update branch staff
  $staffStmt = $pdo->prepare(
    "UPDATE branch_staff_tb SET permissions = :perms, status = :status WHERE user_id = :user_id"
  );
  $staffStmt->execute([
    ':perms' => $data['permissions'], 
    ':status' => $data['status'],
    ':user_id' => $user_id
  ]);

  // update staff sched
  $getStaff = $pdo->prepare("SELECT staff_id FROM branch_staff_tb WHERE user_id = ?");
  $getStaff->execute([$user_id]);
  $staff_id = $getStaff->fetchColumn();

  if($staff_id && isset($data['schedule'])) {
    $scheduleData = json_decode($data['schedule'], true);

    $schedUpdateStmt = $pdo->prepare(
      "UPDATE branch_staff_schedule_tb 
        SET start_time = :start, 
          end_time = :end, 
          is_available = :available 
        WHERE staff_id = :staff_id AND day_of_week = :day"
    );

    foreach($scheduleData as $dayName => $times) {
      $schedUpdateStmt->execute([
        ':start' => $times['start'],
        ':end' => $times['end'],
        ':available' => $times['is_workday'] ? 1 : 0,
        ':staff_id' => $staff_id,
        ':day' => $dayName
      ]);
    }
  }

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Staff updated successfully"]);

} catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}