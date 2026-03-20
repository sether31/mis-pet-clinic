<?php
// Fix: Use 3 levels of ../ to reach the root backend-api folder
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

try {
  // 1. Allow ANY authenticated role to see THEIR OWN notifications
  $decoded = validate_auth(['super_admin', 'clinic_admin', 'branch_admin']); 
  
  $userId = $decoded->user_id;
  $pdo = (new Database())->pdo;

  // 2. Get the total unread for the logged-in user
  $countStmt = $pdo->prepare("SELECT COUNT(*) FROM notification_tb WHERE user_id = ? AND is_read = 0");
  $countStmt->execute([$userId]);
  $unreadCount = $countStmt->fetchColumn();

  // 3. Fetch notifications for THIS user only
  $stmt = $pdo->prepare(
    "SELECT notification_id as id, category, title, message, is_read, created_at 
    FROM notification_tb 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 250"
  );
  $stmt->execute([$userId]);
  $messages = $stmt->fetchAll();

  $formattedMessages = [];
  foreach ($messages as $msg) {
    $formattedMessages[] = [
      'id' => (int)$msg['id'],
      'type' => $msg['category'], 
      'title' => $msg['title'],
      'message' => $msg['message'],
      'isRead' => (bool)$msg['is_read'], 
      'date' => date('M j, Y, g:i A', strtotime($msg['created_at']))
    ];
  }

  echo json_encode([
    "success" => true,
    "unread_count" => (int)$unreadCount,
    "data" => $formattedMessages
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}
?>