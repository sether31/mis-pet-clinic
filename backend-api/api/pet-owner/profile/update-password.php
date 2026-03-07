<?php
ob_clean();
error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED);
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

$decoded = validate_auth(['pet_owner']);

try {
  $pdo = (new Database())->pdo;
  $user_id = $decoded->user_id;
  $data = json_decode(file_get_contents("php://input"));

  if (empty($data->current_password) || empty($data->new_password)) {
    throw new Exception("All fields are required.");
  }

  // Get current user password from DB
  $stmt = $pdo->prepare("SELECT password FROM user_tb WHERE user_id = ?");
  $stmt->execute([$user_id]);
  $user = $stmt->fetch();

  // Verify current password
  if (!password_verify($data->current_password, $user['password'])) {
    throw new Exception("Incorrect current password.");
  }

  // Hash new password and update
  $newHash = password_hash($data->new_password, PASSWORD_DEFAULT);
  $updateStmt = $pdo->prepare("UPDATE user_tb SET password = ?, updated_at = NOW() WHERE user_id = ?");
  $updateStmt->execute([$newHash, $user_id]);

  echo json_encode(["success" => true, "message" => "Password updated successfully."]);

} catch(Exception $e) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>