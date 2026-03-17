<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

$user = validate_auth(['pet_owner']);
$owner_id = $user->user_id;

$data = json_decode(file_get_contents("php://input"), true);
$pet_id = $data['pet_id'] ?? null;
$action = $data['action'] ?? null; 

if (!$pet_id || !$action) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Pet ID and action are required."]);
  exit;
}

try {
  $pdo = (new Database())->pdo;

  // Verify ownership
  $stmtCheck = $pdo->prepare("SELECT pet_id FROM pet_tb WHERE pet_id = ? AND owner_id = ?");
  $stmtCheck->execute([$pet_id, $owner_id]);
  if (!$stmtCheck->fetch()) {
      http_response_code(403);
      echo json_encode(["success" => false, "message" => "Unauthorized action."]);
    exit;
  }

  if ($action === 'deceased') {
    $stmtUpdate = $pdo->prepare("UPDATE pet_tb SET is_deceased = 1, deceased_date = CURRENT_DATE WHERE pet_id = ?");
    $stmtUpdate->execute([$pet_id]);
    $message = "Pet marked as deceased.";
    
  } elseif ($action === 'delete') {
    // We use status to hide from mobile app but keep data for clinic
    $stmtUpdate = $pdo->prepare("UPDATE pet_tb SET status = 0 WHERE pet_id = ?");
    $stmtUpdate->execute([$pet_id]);
    $message = "Pet deleted successfully.";
      
  } elseif ($action === 'restore') {
    $stmtUpdate = $pdo->prepare("UPDATE pet_tb SET status = 1, is_deceased = 0, deceased_date = NULL WHERE pet_id = ?");
    $stmtUpdate->execute([$pet_id]);
    $message = "Pet restored successfully.";
  } else {
    throw new Exception("Invalid action.");
  }

  echo json_encode(["success" => true, "message" => $message]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>