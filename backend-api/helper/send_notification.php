<?php
function send_notification($pdo, $userId, $category, $title, $message) {
  try {
    $stmt = $pdo->prepare(
      "INSERT INTO notification_tb (user_id, category, title, message, is_read, created_at) 
      VALUES (?, ?, ?, ?, 0, NOW())"
    );
    return $stmt->execute([$userId, $category, $title, $message]);
  } catch (PDOException $e) {
    die("Database Error: " . $e->getMessage());
  }
}
?>