<?php
require_once __DIR__ . '/../../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../../config/Database.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);

$branch_id = $_GET['branch_id'] ?? null;

if (!$branch_id) {
  echo json_encode(["success" => false, "message" => "Branch ID required"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $stmt = $pdo->prepare(
    "SELECT bs.*, s.price, s.name as plan_name 
    FROM branch_subscriptions_tb bs
    JOIN subscription_tb s ON bs.subscription_id = s.subscription_id
    WHERE bs.branch_id = :branch_id AND bs.status = 'active'
    LIMIT 1"
  );
  $stmt->execute(['branch_id' => $branch_id]);
  $current = $stmt->fetch();

  echo json_encode(["success" => true, "data" => $current]);
} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}