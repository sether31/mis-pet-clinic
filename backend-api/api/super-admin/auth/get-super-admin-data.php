<?php
ob_clean();
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';

$decoded = validate_auth(['super_admin']); 

header('Content-Type: application/json');

try {
  $pdo = (new Database())->pdo;
    
  $stmt = $pdo->prepare(
    "SELECT 
      u.user_id, 
      u.email,
      u.first_name, 
      u.last_name,
      r.role_name as role
    FROM user_tb u
    JOIN roles_tb r ON u.role_id = r.role_id
    WHERE u.user_id = :user_id 
    AND u.role_id = 1 
    LIMIT 1"
  );
    
  $stmt->execute([':user_id' => $decoded->user_id]);
  $user = $stmt->fetch();

  if($user) {
    echo json_encode([
      "success" => true,
      "user" => [
        "id" => $user['user_id'],
        "role" => $user['role'],
        "email" => $user['email'],
        "name" => $user['first_name'] . ' ' . $user['last_name'],
        "fname" => $user['first_name'],
        "lname" => $user['last_name']
      ]
    ]);
  } else {
    echo json_encode(["success" => false, "message" => "Super Admin access revoked"]);
  }
} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Server error"]);
}