<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../service/Otp.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';

$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);
$userId = $user->user_id; 

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents("php://input"), true);
  
  $newPassword = $data['new_password'] ?? '';
  $otp = $data['otp'] ?? '';

  if(!verifyOtp($userId, $otp, 'change_password')) {
    throw new Exception("Invalid or expired verification code.");
  }

  if(strlen($newPassword) < 6) {
    throw new Exception("Password must be at least 6 characters long.");
  }

  $hashed = password_hash($newPassword, PASSWORD_BCRYPT);
  $update = $pdo->prepare("UPDATE user_tb SET password = ? WHERE user_id = ?");
  $update->execute([$hashed, $userId]);

  // cleanup and audit
  cleanupOtp($userId, 'change_password');
  log_audit($pdo, $userId, null, null, 'UPDATE', 'USER', $userId);

  echo json_encode(["success" => true, "message" => "Password updated successfully."]);

} catch (Exception $e) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}