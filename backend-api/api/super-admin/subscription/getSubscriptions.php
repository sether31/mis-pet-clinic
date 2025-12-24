<?php
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../middleware/auth_middleware.php';

$admin = validate_auth(['super_admin']);

try {
  $pdo = (new Database())->pdo;

  // Fetch all subscriptions to let React handle tab filtering
  $stmt = $pdo->prepare("SELECT * FROM subscription_tb ORDER BY created_at DESC");
  $stmt->execute();
    
  $subscriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);

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