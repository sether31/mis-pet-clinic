<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../service/MailService.php';
require_once __DIR__ . '/../service/Otp.php'; 

try {
    $pdo = (new Database())->pdo;
    $dataInput = json_decode(file_get_contents("php://input"), true);

    $email = trim($dataInput['email'] ?? '');
    if(!$email) {
      throw new Exception("Email is required");
      exit;
    }

    // Check email
    $stmt = $pdo->prepare("SELECT * FROM user_tb WHERE email = ?");
    $stmt->execute([$email]);
    if($stmt->rowCount() > 0) {
      throw new Exception("Email already in use");
      exit;
    }

    // temporary id
    $tempUserId = bin2hex(random_bytes(8));
    // generate otp
    $otpData = generateOtp($tempUserId, 'register', 5);
    sendMailOTP(
      $dataInput['email'],
      $otpData['otp'],
      $dataInput['firstName'],
      'register',
      $otpData['expires_at']
    );

    echo json_encode([
      "success" => true,
      "temp_user_id" => $tempUserId,
      "inputs" => $dataInput,
      "message" => "OTP sent to your email"
    ]);

} catch (Exception $e) {
    echo json_encode([
      "success" => false,
      "message" => $e->getMessage()
    ]);
}
?>
