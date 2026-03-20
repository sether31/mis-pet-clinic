<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

// 1. Restrict access to Super Admin ONLY
$user = validate_auth(['super_admin']);

try {
  $pdo = (new Database())->pdo;

  // 2. Query only the unread notifications for this specific Super Admin
  $stmt = $pdo->prepare("SELECT COUNT(*) FROM notification_tb WHERE user_id = ? AND is_read = 0");
  $stmt->execute([$user->user_id]);
  
  $count = (int)$stmt->fetchColumn();

  echo json_encode([
    "success" => true,
    "count" => $count
  ]);

} catch (Exception $e) {
  // Standard error response
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "message" => "Failed to get unread count: " . $e->getMessage()
  ]);
}
?>