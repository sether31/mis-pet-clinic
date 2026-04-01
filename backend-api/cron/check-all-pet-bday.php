<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

require_once '../config/Database.php';
require_once '../helper/send_notification.php';

$cron_key = $_ENV['CRON_SECURE_KEY'] ?? getenv('CRON_SECURE_KEY');

if (!isset($_GET['key']) || $_GET['key'] !== $cron_key) {
  http_response_code(403);
  echo json_encode(["success" => false, "message" => "Unauthorized access."]);
  exit;
}

try {
  $pdo = (new Database())->pdo;

  // 2. FETCH ALL BIRTHDAY PETS
  // Filters: Living pets, Active profiles, and matching Day/Month
  $stmt = $pdo->prepare("
    SELECT p.pet_id, p.name, p.owner_id 
    FROM pet_tb p
    WHERE (p.status = 1 OR p.status IS NULL) 
      AND (p.is_deceased = 0 OR p.is_deceased IS NULL)
      AND MONTH(p.birthdate) = MONTH(CURDATE()) 
      AND DAY(p.birthdate) = DAY(CURDATE())
  ");
  $stmt->execute();
  $birthdayPets = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $sentCount = 0;

  foreach ($birthdayPets as $pet) {
      $ownerId = $pet['owner_id'];
      $petName = ucwords($pet['name']);
      
      // 3. ANTI-SPAM CHECK
      // Ensure we haven't already sent a birthday message for THIS pet TODAY.
      $checkStmt = $pdo->prepare("
          SELECT COUNT(*) 
          FROM notification_tb 
          WHERE user_id = ? 
            AND category = 'system' 
            AND title = 'Happy Birthday!'
            AND message LIKE ? 
            AND DATE(created_at) = CURDATE()
      ");
      $checkStmt->execute([$ownerId, "%$petName%"]);

      if ($checkStmt->fetchColumn() == 0) {
          $title = "Happy Birthday!";
          $message = "It's {$petName}'s birthday today! Give them some extra treats from us! 🎂🥳";
          
          // 4. SEND NOTIFICATION
          if (send_notification($pdo, $ownerId, 'system', $title, $message)) {
            $sentCount++;
          }
      }
  }

  echo json_encode([
      "success" => true,
      "message" => "Birthday sync complete.",
      "birthdays_found" => count($birthdayPets),
      "notifications_sent" => $sentCount
  ]);

} catch (Exception $e) {
  error_log("Global Birthday Cron Failed: " . $e->getMessage());
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}