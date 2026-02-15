<?php
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);

try {
  $pdo = (new Database())->pdo;
  // fetch active plans
  $stmt = $pdo->query("SELECT * FROM subscription_tb WHERE is_active = 1 ORDER BY price ASC");
  $data = $stmt->fetchAll();

  echo json_encode(["success" => true, "data" => $data]);
} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}