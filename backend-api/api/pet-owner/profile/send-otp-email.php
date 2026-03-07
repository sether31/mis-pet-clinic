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

  $dataInput = json_decode(file_get_contents("php://input"), true);
  $newEmail = $dataInput['new_email'] ?? null; 

  if (!$newEmail) throw new Exception("New email address is required.");

  // CHECK IF EMAIL IS TAKEN
  $stmtCheck = $pdo->prepare("SELECT user_id FROM user_tb WHERE email = ? LIMIT 1");
  $stmtCheck->execute([$newEmail]);
  if ($stmtCheck->fetch()) {
      throw new Exception("This email address is already registered to another account.");
  }

  // GET CURRENT USER TO SEND THE EMAIL TO THEIR CURRENT INBOX
  $stmtUser = $pdo->prepare("SELECT email, first_name FROM user_tb WHERE user_id = ?");
  $stmtUser->execute([$userId]);
  $user = $stmtUser->fetch();

  if (!$user) throw new Exception("User account not found.");

  // GENERATE AND SEND OTP
  $otpData = generateOtp($userId, 'change_email', 5);
  sendMailOTP($user['email'], $otpData['otp'], $user['first_name'], 'change_email', $otpData['expires_at']);
  log_audit($pdo, $userId, null, null, 'EMAIL_CHANGE_REQ', 'USER', $userId);

  echo json_encode(["success" => true, "message" => "Verification code sent."]);

} catch (Throwable $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>