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
  
  $newEmail = trim($data['new_email'] ?? '');
  $otp = trim($data['otp'] ?? '');

  if(!verifyOtp($userId, $otp, 'change_email')) {
    throw new Exception("Invalid or expired verification code.");
  }

  $check = $pdo->prepare("SELECT user_id FROM user_tb WHERE email = ? AND user_id != ?");
  $check->execute([$newEmail, $userId]);
  if($check->fetch()) {
    throw new Exception("This email is already registered to another account.");
  }

  $update = $pdo->prepare("UPDATE user_tb SET email = ? WHERE user_id = ?");
  $update->execute([$newEmail, $userId]);

  // audit and cleanup
  cleanupOtp($userId, 'change_email');
  log_audit($pdo, $userId, null, null, 'UPDATE', 'USER', $userId);

  echo json_encode(["success" => true, "message" => "Email updated successfully."]);

} catch (Exception $e) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}