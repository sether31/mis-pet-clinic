<?php
ob_clean();
require_once __DIR__ . '/../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../service/Jwt.php'; 

$decoded = validate_auth(['pet_owner']); 
header('Content-Type: application/json');

try {
  $pdo = (new Database())->pdo;
  $userId = $decoded->user_id;

  // get user data
  $stmtUser = $pdo->prepare(
    "SELECT u.user_id, u.profile_picture, u.email, u.first_name, u.last_name, r.role_name, u.status
    FROM user_tb u
    JOIN roles_tb r ON u.role_id = r.role_id
    WHERE u.user_id = :user_id"
  );
  $stmtUser->execute([":user_id" => $userId]);
  $user = $stmtUser->fetch();

  if(!$user) {
    throw new Exception("User not found");
  }

  if($user['status'] !== 'approved') {
    throw new Exception("Account revoked or inactive.");
  }

  $fullName = trim($user['first_name'] . ' ' . $user['last_name']);

  // create payload
  $payload = [
    "user_id" => $user['user_id'],
    "role" => $user['role_name'],
    "profile_picture" => $user['profile_picture'],
    "email" => $user['email'],
    "fname" => $user['first_name'],
    "lname" => $user['last_name'],
    "name" => $fullName,
    "status" => $user['status']
  ];

  // generate token
  $accessToken = createJWT($payload, 604800);

  echo json_encode([
    "success" => true,
    "user" => $payload,
    "new_token" => $accessToken 
  ]);

} catch(Throwable $e) {
  http_response_code(401);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>