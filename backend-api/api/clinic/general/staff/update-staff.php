<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if(!$data || !isset($data['user_id'])) {
  echo json_encode(["success" => false, "message" => "Invalid data or missing User ID"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  // update user data
  $stmtUser = $pdo->prepare(
    "UPDATE user_tb SET 
      first_name = :fname, 
      last_name = :lname, 
      email = :email, 
      role_id = :role_id 
    WHERE user_id = :user_id"
);
  $stmtUser->execute([
    ':fname' => $data['fname'],
    ':lname' => $data['lname'],
    ':email' => $data['email'],
    ':role_id' => $data['role_id'],
    ':user_id' => $data['user_id']
  ]);

  // update staff status
  $permissionsJson = json_encode($data['permissions'] ?? []);

  $stmtStaff = $pdo->prepare(
    "UPDATE branch_staff_tb 
    SET permissions = :permissions, 
    status = :status 
    WHERE user_id = :user_id AND branch_id = :branch_id"
  );
  $stmtStaff->execute([
    ':permissions' => $permissionsJson,
    ':status' => $data['status'], 
    ':user_id' => $data['user_id'],
    ':branch_id' => $data['branch_id']
  ]);

  $pdo->commit();

  echo json_encode([
    "success" => true,
    "message" => "Staff member updated successfully"
  ]);

} catch(Exception $e) {
  // check if the email already exists
  if(strpos($e->getMessage(), 'Duplicate entry') !== false) {
    echo json_encode(["success" => false, "message" => "Email address is already in use by another account."]);
  } else {
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
  }
}