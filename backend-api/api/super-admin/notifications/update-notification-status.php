<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';

try {
  // 1. Allow Super Admins, Clinic Admins, AND Branch Admins
  $decoded = validate_auth(['super_admin', 'clinic_admin', 'branch_admin']);
  
  $user_id = $decoded->user_id;
  $pdo = (new Database())->pdo;
  
  $data = json_decode(file_get_contents("php://input"), true);
  $notif_id = $data['notification_id'] ?? null;

  if (!$notif_id) {
      throw new Exception("Notification ID is required.");
  }

  if ($notif_id === 'all') {
      // Marks all unread notifications for the LOGGED-IN user only
      $stmt = $pdo->prepare("UPDATE notification_tb SET is_read = 1 WHERE user_id = ? AND is_read = 0");
      $stmt->execute([$user_id]);
      $message = "All notifications marked as read.";
  } else {
      // Marks a specific notification ONLY if it belongs to the logged-in user
      $stmt = $pdo->prepare("UPDATE notification_tb SET is_read = 1 WHERE notification_id = ? AND user_id = ? AND is_read = 0");
      $stmt->execute([$notif_id, $user_id]);
      
      if ($stmt->rowCount() === 0) {
          throw new Exception("Notification not found or already read.");
      }
      $message = "Notification marked as read.";
  }

  echo json_encode(["success" => true, "message" => $message]);

} catch (Exception $e) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>