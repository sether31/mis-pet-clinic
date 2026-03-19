<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

$owner = validate_auth(['pet_owner']); 
$userId = $owner->user_id ?? null;

// 👇 Check if the frontend is asking for archived pets
$is_archived = isset($_GET['archived']) && $_GET['archived'] == '1';

try {
  $pdo = (new Database())->pdo;

  if(!$userId) {
    throw new Exception("Unauthorized access.");
  }

  // 👇 Filter by status (1 for archived, 0 or NULL for active)
  if ($is_archived) {
    $status_condition = "status = 0";
  } else {
    $status_condition = "status = 1";
  }

  // Fetch pets belonging to this user, newest first
  $stmt = $pdo->prepare("SELECT * FROM pet_tb WHERE owner_id = :owner_id AND $status_condition ORDER BY created_at DESC");
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