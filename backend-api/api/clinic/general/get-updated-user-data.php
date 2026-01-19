<?php
ob_clean();
// api/auth/get-profile.php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

// Validates the token; returns the decoded user data
$decoded = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

header('Content-Type: application/json');

try {
  $pdo = (new Database())->pdo;
  
  // We fetch the current role from roles_tb and permissions from branch_staff_tb
  // We join these to get a "Live" snapshot of the user status
  $stmt = $pdo->prepare("
    SELECT 
      u.user_id, 
      r.role_name as role, 
      bs.permissions,
      bs.branch_id
    FROM user_tb u
    JOIN roles_tb r ON u.role_id = r.role_id
    LEFT JOIN branch_staff_tb bs ON u.user_id = bs.user_id
    WHERE u.user_id = :user_id
    LIMIT 1
  ");
  
  $stmt->execute([':user_id' => $decoded->user_id]);
  $user = $stmt->fetch();

  if($user) {
    echo json_encode([
      "success" => true,
      "user" => [
          "id" => $user['user_id'],
          "role" => $user['role'],
          "branch_id" => $user['branch_id'],
          "permissions" => json_decode($user['permissions'] ?? '[]')
      ]
    ]);
  } else {
    echo json_encode(["success" => false, "message" => "User not found"]);
  }

} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}