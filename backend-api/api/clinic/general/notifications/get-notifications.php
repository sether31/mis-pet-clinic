<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

try {
  // 1. Restrict access to clinic admins and branch staff only
  $decoded = validate_auth([
    'clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff'
  ]);
  
  $userId = $decoded->user_id;
  $pdo = (new Database())->pdo;

  // 2. Get the TRUE total of unread messages for the red badge
  $countStmt = $pdo->prepare("SELECT COUNT(*) FROM notification_tb WHERE user_id = ? AND is_read = 0");
  $countStmt->execute([$userId]);
  $unreadCount = $countStmt->fetchColumn();

  // 3. Optional Limit: Defaults to 100 for the main table, but can be smaller for a dropdown bell
  $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;

  // 4. Fetch the notifications
  $stmt = $pdo->prepare(
    "SELECT notification_id as id, category, title, message, is_read, created_at 
    FROM notification_tb 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT $limit"
  );
  $stmt->execute([$userId]);
  $messages = $stmt->fetchAll();

  // 5. Format exactly for the React Notifications Table
  $formattedMessages = [];
  foreach ($messages as $msg) {
    $formattedMessages[] = [
      'id' => $msg['id'],
      'type' => $msg['category'], 
      'title' => $msg['title'],
      'message' => $msg['message'],
      'isRead' => $msg['is_read'] == 1, // Converts 1/0 to true/false for React
      'date' => date('M j, Y, g:i A', strtotime($msg['created_at']))
    ];
  }

  echo json_encode([
    "success" => true,
    "unread_count" => $unreadCount,
    "data" => $formattedMessages
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>