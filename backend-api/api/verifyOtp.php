<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST, GET");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../service/MailService.php';
require_once __DIR__ . '/../service/Jwt.php';  
require_once __DIR__ . '/../service/Otp.php'; 


try {
  $pdo = (new Database())->pdo;

  $data = json_decode(file_get_contents("php://input"), true);
  $userId = $data['user_id'] ?? null;
  $otpCode = $data['otp'] ?? null;

  if(!$userId || !$otpCode) {
    echo json_encode(["success" => false, "message" => "User ID and OTP are required"]);
    exit;
  }

  if(!verifyOtp($userId, $otpCode, 'login')) {
    echo json_encode(["success" => false, "message" => "Invalid or expired OTP"]);
    exit;
  }

  // get user 
  $stmtUser = $pdo->prepare(
    "SELECT u.user_id, u.email, u.name, r.role_name
    FROM user_tb u
    JOIN roles_tb r ON u.role_id = r.role_id
    WHERE u.user_id = :user_id"
  );
  $stmtUser->execute([":user_id" => $userId]);
  $user = $stmtUser->fetch();

  $payload = [
    "user_id" => $user['user_id'],
    "email" => $user['email'],
    "name" => $user['name'],
    "role" => $user['role_name']
  ];

  $accessToken = createJWT($payload, 3600);
  $refreshToken = createJWT($payload, 60 * 60 * 24 * 30);

  echo json_encode([
    "success" => true,
    "message" => "Login successful",
    "access_token" => $accessToken,
    "refresh_token" => $refreshToken
  ]);

} catch(Exception $e) {
  echo json_encode([
    "success" => false,
    "message" => "Server error",
    "error" => $e->getMessage()
  ]);
  exit;
}


?>