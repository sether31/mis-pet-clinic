<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST, GET");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../service/MailService.php';
require_once __DIR__ . '/../../service/Jwt.php';  
require_once __DIR__ . '/../../service/Otp.php'; 

try {
  $pdo = (new Database())->pdo;

  $data = json_decode(file_get_contents("php://input"), true);
  $userId = $data['user_id'] ?? null;
  $otpCode = $data['otp'] ?? null;

  if(!$userId || !$otpCode) {
    throw new Exception("User ID and OTP are required");
  }

  if(!verifyOtp($userId, $otpCode, 'login')) {
    throw new Exception("Invalid or expired OTP");
  }

  // get user 
  $stmtUser = $pdo->prepare(
    "SELECT u.user_id, u.email, u.first_name, u.last_name, r.role_name, status
    FROM user_tb u
    JOIN roles_tb r ON u.role_id = r.role_id
    WHERE u.user_id = :user_id"
  );
  $stmtUser->execute([":user_id" => $userId]);
  $user = $stmtUser->fetch();

  if(!$user) {
    throw new Exception("User not found");
  }

  $payload = [
    "user_id" => $user['user_id'],
    "role" => $user['role_name'],
    "email" => $user['email'],
    "fname" => $user['first_name'],
    "lname" => $user['last_name'],
    "status" => $user['status']
  ];

  $accessToken = createJWT($payload, 1000000000);

  echo json_encode([
    "success" => true,
    "message" => "Login successful",
    "access_token" => $accessToken
  ]);

} catch(Throwable $e) {
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
  exit;
}


?>