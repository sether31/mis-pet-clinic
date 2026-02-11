<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

$admin = validate_auth(['super_admin']);

try {
  $pdo = (new Database())->pdo;

  // fetch all subscriptions to let React handle tab filtering
  $stmt = $pdo->prepare("SELECT * FROM subscription_tb ORDER BY created_at DESC");
  $stmt->execute();
    
  $subscriptions = $stmt->fetchAll();

  echo json_encode([
    "success" => true, 
    "data" => $subscriptions 
  ]);

} catch (PDOException $e) {
  echo json_encode([
    "success" => false, 
    "message" => "Database Error: " . $e->getMessage()
  ]);
}
?>