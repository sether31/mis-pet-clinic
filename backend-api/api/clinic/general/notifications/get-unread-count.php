<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

// Validate user (allow all clinic staff roles)
$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);

try {
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare("SELECT COUNT(*) FROM notification_tb WHERE user_id = ? AND is_read = 0");
  $stmt->execute([$user->user_id]);
  
  $count = (int)$stmt->fetchColumn();

  echo json_encode([
      "success" => true,
      "count" => $count
  ]);

} catch (Exception $e) {
  echo json_encode([
    "success" => false,
    "message" => "Failed to get count: " . $e->getMessage()
  ]);
}
?>