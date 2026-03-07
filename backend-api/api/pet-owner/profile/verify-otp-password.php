<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../service/Otp.php'; 
require_once __DIR__ . '/../../../helper/log_audit.php';

try {
  $decoded = validate_auth(['pet_owner']);
  $userId = $decoded->user_id;

  $pdo = (new Database())->pdo;
  $dataInput = json_decode(file_get_contents("php://input"), true);
  
  $otpCode = $dataInput['otp'] ?? null;
  $newPassword = $dataInput['new_password'] ?? null;
  $purpose = 'change_password';

  if (!$otpCode || !$newPassword) {
    throw new Exception("Verification code and new password are required");
  }

  // Verify OTP 
  if (!verifyOtp($userId, $otpCode, $purpose)) {
    throw new Exception("Invalid or expired verification code");
  }

  $pdo->beginTransaction();

  // Update the user record with the hashed new password
  $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
  
  $stmtUpdate = $pdo->prepare("UPDATE user_tb SET password = ? WHERE user_id = ?");
  $stmtUpdate->execute([$newHash, $userId]);

  // Clean up the used OTP 
  $stmtClean = $pdo->prepare("DELETE FROM otp_tb WHERE user_id = ? AND purpose = ?");
  $stmtClean->execute([$userId, $purpose]);

  // Audit Log
  log_audit($pdo, $userId, null, null, 'PASSWORD_RESET_SUCCESS', 'USER', $userId);

  $pdo->commit();

  echo json_encode([
    "success" => true,
    "message" => "Your password has been updated successfully!"
  ]);

} catch (Throwable $e) {
  if (isset($pdo) && $pdo->inTransaction()) {
    $pdo->rollBack();
  }

  echo json_encode([
    "success" => false, 
    "message" => $e->getMessage()
]);
}
?>