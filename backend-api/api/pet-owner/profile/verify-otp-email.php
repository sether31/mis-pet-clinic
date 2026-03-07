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
  $newEmail = $dataInput['new_email'] ?? null;
  $purpose = 'change_email';

  if (!$otpCode || !$newEmail) {
    throw new Exception("Verification code and new email are required.");
  }

  // Double-check the email isn't taken (just in case they bypassed the first check)
  $stmtCheck = $pdo->prepare("SELECT user_id FROM user_tb WHERE email = ? AND user_id != ?");
  $stmtCheck->execute([$newEmail, $userId]);
  if($stmtCheck->fetch()) {
    throw new Exception("This email address is already in use by another account.");
  }

  // Verify OTP 
  if(!verifyOtp($userId, $otpCode, $purpose)) {
    throw new Exception("Invalid or expired verification code.");
  }

  $pdo->beginTransaction();

  // Update the user's email
  $stmtUpdate = $pdo->prepare("UPDATE user_tb SET email = ?, updated_at = NOW() WHERE user_id = ?");
  $stmtUpdate->execute([$newEmail, $userId]);

  // Clean up the used OTP
  $stmtClean = $pdo->prepare("DELETE FROM otp_tb WHERE user_id = ? AND purpose = ?");
  $stmtClean->execute([$userId, $purpose]);

  // Audit Log 
  log_audit($pdo, $userId, null, null, 'EMAIL_CHANGE_SUCCESS', 'USER', $userId);

  $pdo->commit();

  echo json_encode([
    "success" => true,
    "message" => "Your email has been updated successfully!"
  ]);

} catch(Throwable $e) {
  if(isset($pdo) && $pdo->inTransaction()) {
    $pdo->rollBack();
  }
  echo json_encode([
    "success" => false, 
    "message" => $e->getMessage()
  ]);
}
?>