<?php
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
  http_response_code(200);
  exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../service/Otp.php';
require_once __DIR__ . '/../../helper/log_audit.php';

try {
  $pdo = (new Database())->pdo;

  $data = json_decode(file_get_contents("php://input"), true);
  $userId = $data['user_id'] ?? null;
  $newPassword = $data['password'] ?? null;

  if (!$userId || !$newPassword) {
    throw new Exception("Missing required data");
  }

  if (strlen($newPassword) < 6) {
    throw new Exception("Password must be at least 6 characters long");
  }

  // hash pass
  $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

  $stmt = $pdo->prepare("UPDATE user_tb SET password = :password WHERE user_id = :user_id");
  $result = $stmt->execute([
    ":password" => $hashedPassword,
    ":user_id" => $userId
  ]);

  if(!$result) {
    throw new Exception("Failed to update password");
  }

  // audit password reset success
  log_audit($pdo, $userId, null, null, 'PASSWORD_RESET_SUCCESS', 'USER', $userId);
  cleanupOtp($userId, 'password_reset');
  
  echo json_encode([
    "success" => true,
    "message" => "Password has been reset successfully. You can now login."
  ]);

} catch (Throwable $e) {
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
  exit;
}