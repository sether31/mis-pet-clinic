<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../service/Otp.php';
require_once __DIR__ . '/../../../../service/MailService.php';

$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);
$userId = $user->user_id;

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents("php://input"), true);
  

  $type = $data['type'] ?? 'security_update';
  $currentPassword = $data['current_password'] ?? '';

  $stmt = $pdo->prepare("SELECT email, first_name, password FROM user_tb WHERE user_id = ?");
  $stmt->execute([$userId]);
  $user = $stmt->fetch();

  if (!$user) throw new Exception("User account not found.");

  if($type === 'change_email') {
    // check email
    if(empty($currentPassword)) {
      throw new Exception("Current password is required.");
    }
    // verify password
    if(!password_verify($currentPassword, $user['password'])) {
      throw new Exception("Password incorrect."); 
    }
  }

  $otpData = generateOtp($userId, $type, 5);

  sendMailOtp(
    $user['email'], 
    $otpData['otp'], 
    $user['first_name'], 
    $type, 
    $otpData['expires_at']
  );

  echo json_encode(["success" => true, "message" => "Verification code sent to your email."]);
} catch (Exception $e) {
  http_response_code(400); 
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}