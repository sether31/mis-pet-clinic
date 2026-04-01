<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

try {
  $decoded = validate_auth(['pet_owner']);
  $userId = $decoded->user_id;
  $pdo = (new Database())->pdo;

  // Get the TRUE total of unread messages for the red badge
  $countStmt = $pdo->prepare("SELECT COUNT(*) FROM notification_tb WHERE user_id = ? AND is_read = 0");
  $countStmt->execute([$userId]);
  $unreadCount = $countStmt->fetchColumn();

  // Fetch ONLY the top 3 latest messages for the preview card
  $stmt = $pdo->prepare(
    "SELECT notification_id as id, category, title as sender, message as text, is_read, created_at 
    FROM notification_tb 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 3"
  );
  $stmt->execute([$userId]);
  $messages = $stmt->fetchAll();

  $formattedMessages = [];
  foreach ($messages as $msg) {
    $formattedMessages[] = [
      'id' => $msg['id'],
      'category' => $msg['category'],
      'sender' => $msg['sender'],
      'text' => $msg['text'],
      'is_read' => $msg['is_read'],
      'time' => date('M j, g:i A', strtotime($msg['created_at']))
    ];
  }

  echo json_encode([
    "success" => true,
    "data" => $formattedMessages,
    "unread_count" => $unreadCount
  ]);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>