<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../service/Otp.php';
require_once __DIR__ . '/../../../service/MailService.php';
require_once __DIR__ . '/../../../helper/log_audit.php';

try {
  $decoded = validate_auth(['pet_owner']);
  $userId = $decoded->user_id;

  $pdo = (new Database())->pdo;

  // Fetch User and Role 
  $stmt = $pdo->prepare(
    "SELECT u.user_id, u.email, u.first_name, r.role_name 
    FROM user_tb u 
    JOIN roles_tb r ON u.role_id = r.role_id 
    WHERE u.user_id = :user_id LIMIT 1"
  );
  $stmt->execute([":user_id" => $userId]);
  $user = $stmt->fetch();

  if (!$user) throw new Exception("User account not found");

  // Generate OTP 
  $otpData = generateOtp($userId, 'change_password', 5);

  // Send Email via your Service
  sendMailOTP(
    $user['email'], 
    $otpData['otp'], 
    $user['first_name'], 
    'change_password', 
    $otpData['expires_at']
  );

  // audit
  log_audit($pdo, $userId, null, null, 'PASSWORD_RESET_REQ', 'USER', $userId);

  echo json_encode([
    "success" => true, 
    "message" => "Verification code sent to your email."
  ]);

} catch (Throwable $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>