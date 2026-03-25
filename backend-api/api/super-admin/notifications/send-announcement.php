<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../helper/send_notification.php'; 

set_time_limit(0);
try {
  // 1. Validate that the user is an Admin
  $decoded = validate_auth(['super_admin']);
  
  $pdo = (new Database())->pdo;
  
  // 2. Get the announcement data from the React frontend
  $data = json_decode(file_get_contents("php://input"), true);
  $title = trim($data['title'] ?? '');
  $message = trim($data['message'] ?? '');

  if (empty($title) || empty($message)) {
    throw new Exception("Title and message are required for an announcement.");
  }

  // 3. Fetch all active users who should receive this notification
  // Usually, you only want to broadcast to 'pet_owner' or similar roles
  $stmt = $pdo->prepare("SELECT user_id FROM user_tb WHERE status = 'approved'");
  $stmt->execute();
  $users = $stmt->fetchAll();

  if (empty($users)) {
    throw new Exception("No active users found to notify.");
  }

  // 4. Loop through users and use your helper to insert into notification_tb
  $successCount = 0;
  foreach ($users as $user) {
    // Using your helper: send_notification($pdo, $userId, $category, $title, $message)
    if (send_notification($pdo, $user['user_id'], 'system', $title, $message)) {
      $successCount++;
    }
  }

  echo json_encode([
    "success" => true, 
    "message" => "Announcement sent successfully to $successCount users."
  ]);

} catch (Exception $e) {
  http_response_code(400);
  echo json_encode([
    "success" => false, 
    "message" => $e->getMessage()
]);
}
?>