<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../service/Jwt.php';  
require_once __DIR__ . '/../../service/Otp.php'; 
require_once __DIR__ . '/../../helper/log_audit.php';

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents("php://input"), true);
  $userId = $data['user_id'] ?? null;
  $otpCode = $data['otp'] ?? null;

  if(!$userId || !$otpCode) throw new Exception("User ID and OTP are required");

  if(!verifyOtp($userId, $otpCode, 'login')) {
    throw new Exception("Invalid or expired OTP");
  }

  // get user details
  $stmtUser = $pdo->prepare(
    "SELECT u.user_id, u.email, u.first_name, u.last_name, u.phone_number, u.profile_picture, r.role_name
    FROM user_tb u
    JOIN roles_tb r ON u.role_id = r.role_id
    WHERE u.user_id = :user_id"
  );
  $stmtUser->execute([":user_id" => $userId]);
  $user = $stmtUser->fetch();

  if(!$user) throw new Exception("User account not found");

  $pdo->beginTransaction();

  // create payload
  $payload = [
    "user_id" => $user['user_id'],
    "role" => $user['role_name'],
    "email" => $user['email'],
    "name" => $user['first_name'] . ' ' . $user['last_name']
  ];
  $accessToken = createJWT($payload, 604800);

  // clean otp
  $stmtClean = $pdo->prepare("DELETE FROM otp_tb WHERE user_id = ? AND purpose = 'login'");
  $stmtClean->execute([$userId]);

  // audit
  log_audit(
    $pdo, 
    $user['user_id'], 
    null, 
    null, 
    'LOGIN', 
    'USER', 
    $user['user_id']
  );

  $pdo->commit();

  echo json_encode([
    "success" => true,
    "message" => "Login successful",
    "access_token" => $accessToken,
    "user" => [
      "user_id" => $user['user_id'],
      "profile_picture" => $user['profile_picture'],
      "email" => $user['email'],
      "name" => $user['first_name'] . ' ' . $user['last_name'],
      "fname" => $user['first_name'],
      "lname" => $user['last_name'],
      "phone_number" => $user['phone_number'], 
      "role" => $user['role_name'],
      "exp" => time() + 604800
    ]
  ]);

} catch (Throwable $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>