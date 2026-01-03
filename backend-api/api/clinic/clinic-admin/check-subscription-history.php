<?php
// check-subscription-history.php
require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../middleware/auth-middleware.php';

$decodedToken = validate_auth(['clinic_admin']);
$data = json_decode(file_get_contents("php://input"), true);
$branchId = $data['branch_id'] ?? null;

$pdo = (new Database())->pdo;

// check if have record existing
$stmt = $pdo->prepare(
  "SELECT status, end_date 
  FROM branch_subscriptions_tb 
  WHERE branch_id = ? 
  ORDER BY created_at DESC LIMIT 1"
);
$stmt->execute([$branchId]);
$sub = $stmt->fetch();

if(!$sub) {
  echo json_encode(["hasSubHistory" => true]);
} else {
  echo json_encode(["hasSubHistory" => false]);
}


?>