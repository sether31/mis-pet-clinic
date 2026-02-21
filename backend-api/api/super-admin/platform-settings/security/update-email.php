<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../service/Otp.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';


$admin = validate_auth(['super_admin']);
$userId = $admin->user_id;

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents("php://input"), true);
  
  $newEmail = trim($data['new_email'] ?? '');
  $currentPassword = $data['current_password'] ?? '';
  $otp = $data['otp'] ?? '';

  // verify otp
  if(!verifyOtp($userId, $otp, 'change_email')) {
    throw new Exception("Invalid or expired verification code.");
  }

  $stmt = $pdo->prepare("SELECT password FROM user_tb WHERE user_id = ?");
  $stmt->execute([$userId]);
  $user = $stmt->fetch();

  if(!$user || !password_verify($currentPassword, $user['password'])) {
    throw new Exception("Security check failed: Incorrect password.");
  }

  $update = $pdo->prepare("UPDATE user_tb SET email = ? WHERE user_id = ?");
  $update->execute([$newEmail, $userId]);


  // audit and cleanup
  cleanupOtp($userId, 'change_email');
  log_audit($pdo, $userId, null, null, 'UPDATE', 'USER', $userId);

  echo json_encode([
    "success" => true, 
    "message" => "Account email updated successfully.",
  ]);

} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}