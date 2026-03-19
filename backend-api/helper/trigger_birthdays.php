<?php
require_once __DIR__ . '/send_notification.php';

function trigger_birthdays($pdo, $userId) {
  try {
    // 👇 FIX: Added filters so it only selects LIVING and ACTIVE pets
    $stmt = $pdo->prepare(
      "SELECT pet_id, name 
      FROM pet_tb 
      WHERE owner_id = ? 
      AND (status = 1 OR status IS NULL) 
      AND (is_deceased = 0 OR is_deceased IS NULL)
      AND MONTH(birthdate) = MONTH(CURDATE()) 
      AND DAY(birthdate) = DAY(CURDATE())"
    );
    $stmt->execute([$userId]);
    $birthdayPets = $stmt->fetchAll();

    foreach ($birthdayPets as $pet) {
      // Anti-Spam Check: Did we already send a message THIS YEAR?
      $checkStmt = $pdo->prepare(
        "SELECT notification_id 
        FROM notification_tb 
        WHERE user_id = ? 
        AND category = 'system' 
        AND title = 'Happy Birthday!'
        AND message LIKE ? 
        AND YEAR(created_at) = YEAR(CURDATE())"
      );
      
      // We use LIKE to make sure we don't accidentally skip a 2nd pet's birthday 
      // if two pets have the same birthday!
      $checkStmt->execute([$userId, "%" . $pet['name'] . "%"]);
      
      // If no message sent this year, create it!
      if ($checkStmt->rowCount() == 0) {
        $bdayTitle = "Happy Birthday!";
        $bdayMessage = "It's " . ucwords($pet['name']) . "'s birthday today! Give them some extra treats from us!";
        
        send_notification($pdo, $userId, 'system', $bdayTitle, $bdayMessage);
      }
    }
  } catch (Exception $e) {
    error_log("Birthday trigger failed: " . $e->getMessage());
  }
}
?>