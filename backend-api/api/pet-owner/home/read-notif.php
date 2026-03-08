<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

try {
  $decoded = validate_auth(['pet_owner']);
  $userId = $decoded->user_id;
  
  $data = json_decode(file_get_contents("php://input"), true);
  $notificationId = $data['notification_id'] ?? null;

  if (!$notificationId) throw new Exception("Notification ID required.");

  $pdo = (new Database())->pdo;
  
  $stmt = $pdo->prepare("UPDATE notification_tb SET is_read = 1 WHERE notification_id = ? AND user_id = ?");
  $stmt->execute([$notificationId, $userId]);

  echo json_encode(["success" => true]);

} catch (Throwable $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>