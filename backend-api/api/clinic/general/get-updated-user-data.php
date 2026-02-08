<?php
ob_clean();
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../service/Jwt.php'; 

$decoded = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
header('Content-Type: application/json');

try {
  $pdo = (new Database())->pdo;
  $userId = $decoded->user_id;

  $stmtUser = $pdo->prepare(
    "SELECT u.user_id, u.email, u.first_name, u.last_name, r.role_name, u.status
    FROM user_tb u
    JOIN roles_tb r ON u.role_id = r.role_id
    WHERE u.user_id = :user_id"
  );
  $stmtUser->execute([":user_id" => $userId]);
  $user = $stmtUser->fetch();

  if(!$user) throw new Exception("User not found");

  $permissions = [];
  $branchId = null;

  // determine permission
  if($user['role_name'] === 'clinic_admin') {
    $permissions = ['all_access']; 
    $branchId = null;
  } else { 
    $stmtStaff = $pdo->prepare(
      "SELECT branch_id, permissions FROM branch_staff_tb 
      WHERE user_id = :user_id AND status = '1' LIMIT 1"
    );
    $stmtStaff->execute([":user_id" => $userId]);
    $staffBranch = $stmtStaff->fetch();

    if($staffBranch) {
      $permissions = json_decode($staffBranch['permissions'] ?? '[]', true);
      $branchId = $staffBranch['branch_id'];
    }
  }

  // create payload
  $payload = [
    "user_id" => $user['user_id'],
    "role" => $user['role_name'],
    "email" => $user['email'],
    "fname" => $user['first_name'],
    "lname" => $user['last_name'],
    "status" => $user['status'],
    "permissions" => $permissions, 
    "branch_id" => $branchId
  ];

  // generate token
  $accessToken = createJWT($payload, 1000000000); 

  echo json_encode([
    "success" => true,
    "user" => [
        "user_id" => $user['user_id'],
        "fname" => $user['first_name'],
        "lname" => $user['last_name'],
        "role" => $user['role_name'],
        "branch_id" => $branchId,
        "permissions" => $permissions
    ],
    "new_token" => $accessToken 
  ]);

} catch(Throwable $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}