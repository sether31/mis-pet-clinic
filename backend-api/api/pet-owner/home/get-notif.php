<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../helper/trigger_birthdays.php';

try {
  $decoded = validate_auth(['pet_owner']);
  $userId = $decoded->user_id;

  $pdo = (new Database())->pdo;

  trigger_birthdays($pdo, $userId);

  // Fetch all notifications for this user, newest first
  $stmt = $pdo->prepare(
    "SELECT notification_id as id, category, title as sender, message as text, is_read, created_at 
    FROM notification_tb 
    WHERE user_id = ? 
    ORDER BY created_at DESC"
  );
  $stmt->execute([$userId]);
  $messages = $stmt->fetchAll();

  // Count unread messages and format the time
  $unreadCount = 0;
  $formattedMessages = [];

  foreach ($messages as $msg) {
    if ($msg['is_read'] == 0) {
      $unreadCount++;
    }
    
    // Formats the timestamp into a nice string like "Oct 24, 10:30 AM"
    $formattedTime = date('M j, g:i A', strtotime($msg['created_at']));

    $formattedMessages[] = [
      'id' => $msg['id'],
      'category' => $msg['category'],
      'sender' => $msg['sender'],
      'text' => $msg['text'],
      'is_read' => $msg['is_read'],
      'time' => $formattedTime 
    ];
  }

  echo json_encode([
    "success" => true,
    "data" => $formattedMessages,
    "unread_count" => $unreadCount
  ]);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
}
?>