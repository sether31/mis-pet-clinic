<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

$owner = validate_auth(['pet_owner']); 
$userId = $owner->user_id ?? null;

try {
  $pdo = (new Database())->pdo;

  if(!$userId) {
    throw new Exception("Unauthorized access.");
  }

  // Fetch pets belonging to this user, newest first
  $stmt = $pdo->prepare("SELECT * FROM pet_tb WHERE owner_id = :owner_id ORDER BY created_at DESC");
  $stmt->execute([':owner_id' => $userId]);
  $pets = $stmt->fetchAll();

  echo json_encode([
    "success" => true,
    "data" => $pets
  ]);

} catch(Exception $e) {
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
}
?>