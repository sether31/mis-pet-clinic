<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

validate_auth(['clinic_admin']); 

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if(!$data) {
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

$permissions = isset($data['permissions']) ? json_encode($data['permissions']) : json_encode([]);

// check if empty
if(empty($fname) || empty($lname) || empty($email) || empty($branch_id) || empty($password)) {
  echo json_encode(["success" => false, "message" => "Missing required fields"]);
  exit;
}

// hash password
$hashed_password = password_hash($password, PASSWORD_DEFAULT);

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  // check if the user is already exist
  $checkEmail = $pdo->prepare("SELECT user_id FROM user_tb WHERE email = ? LIMIT 1");
  $checkEmail->execute([$email]);

  if($checkEmail->rowCount() > 0) {
    echo json_encode(["success" => false, "message" => "Email already registered"]);
    exit;
  }

  // insert in user_tb
  $userStmt = $pdo->prepare(
    "INSERT INTO user_tb (first_name, last_name, email, password, role_id, status) 
    VALUES (:fname, :lname, :email, :password, :role_id, :status)"
  );
  $userStmt->execute([
    ':fname' => $fname,
    ':lname' => $lname,
    ':email' => $email,
    ':password' => $hashed_password,
    ':role_id' => $role_id,
    ':status' => 'approved'
  ]);

  $user_id = $pdo->lastInsertId();
  
  $staffStmt = $pdo->prepare(
    "INSERT INTO branch_staff_tb (user_id, branch_id, permissions, status) 
    VALUES (:user_id, :branch_id, :permissions, :status)"
  );
  $staffStmt->execute([
    ':user_id' => $user_id,
    ':branch_id' => $branch_id,
    ':permissions' => json_encode($data['permissions'] ?? []),
    ':status' => $status
  ]);

  $pdo->commit();

  echo json_encode([
    "success" => true, 
    "message" => "Staff member created successfully."
  ]);
} catch(Exception $e) {
  echo json_encode([
    "success" => false, 
    "message" => "Database error: " . $e->getMessage()
  ]);
}