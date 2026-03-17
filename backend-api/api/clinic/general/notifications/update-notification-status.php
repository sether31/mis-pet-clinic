<?php
ob_clean();
require_once __DIR__ . '/../../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../../config/Database.php';

try {
  // 1. Authenticate the clinic staff
  $decoded = validate_auth([
    'clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff'
  ]);
  
  $user_id = $decoded->user_id;
  $pdo = (new Database())->pdo;
  
  // 2. Grab the notification_id from the React fetch body
  $data = json_decode(file_get_contents("php://input"), true);
  $notif_id = $data['notification_id'] ?? null;

  if (!$notif_id) {
    throw new Exception("Notification ID is required.");
  }

  // 3. Check if they clicked "Mark All Read" or just viewed a specific one
  if ($notif_id === 'all') {
    // Mark ALL of this user's unread notifications as read
    $stmt = $pdo->prepare("UPDATE notification_tb SET is_read = 1 WHERE user_id = ? AND is_read = 0");
    $stmt->execute([$user_id]);
    $message = "All notifications marked as read.";
  } else {
    // Mark ONLY the specific notification as read (and ensure it actually belongs to them)
    $stmt = $pdo->prepare("UPDATE notification_tb SET is_read = 1 WHERE notification_id = ? AND user_id = ? AND is_read = 0");
    $stmt->execute([$notif_id, $user_id]);
    $message = "Notification marked as read.";
  }

  // 4. Return success to React
  echo json_encode(["success" => true, "message" => $message]);

} catch (Exception $e) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>