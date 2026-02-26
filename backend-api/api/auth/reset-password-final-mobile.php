<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST");

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../helper/log_audit.php';

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents("php://input"), true);
  
  $userId = $data['user_id'] ?? null;
  $newPassword = $data['password'] ?? null;

  if (!$userId || !$newPassword) throw new Exception("User ID and new password are required");

  $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

  $pdo->beginTransaction();

  // Update the password
  $stmt = $pdo->prepare("UPDATE user_tb SET password = :password WHERE user_id = :id");
  $stmt->execute([':password' => $hashedPassword, ':id' => $userId]);

  // audit
  log_audit($pdo, $userId, null, null, 'PASSWORD_RESET_SUCCESS', 'USER', $userId);

  $pdo->commit();

  echo json_encode(["success" => true, "message" => "Your password has been reset successfully!"]);

} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}