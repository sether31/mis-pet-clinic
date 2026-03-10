<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../service/MailService.php';
require_once __DIR__ . '/../../service/Otp.php'; 

try {
  $pdo = (new Database())->pdo;
  $dataInput = json_decode(file_get_contents("php://input"), true);

  $email = trim($dataInput['email'] ?? '');
  $firstName = trim($dataInput['first_name'] ?? 'User');

  if(!$email) throw new Exception("Email is required");

  $stmt = $pdo->prepare("SELECT user_id FROM user_tb WHERE email = ?");
  $stmt->execute([$email]);
  if($stmt->rowCount() > 0) {
    throw new Exception("Email already in use");
  }

  // generate temporary id
  $tempUserId = rand(10000000, 99999999);

  // create otp
  $otpData = generateOtp($tempUserId, 'register', 5);

  sendMailOTP(
      $email,
      $otpData['otp'],
      $firstName,
      'register',
      $otpData['expires_at']
    );

  echo json_encode([
    "success" => true,
    "temp_user_id" => $tempUserId,
    "message" => "OTP sent to your email"
  ]);

} catch (Exception $e) {
  http_response_code(400);
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
  exit;
}
?>