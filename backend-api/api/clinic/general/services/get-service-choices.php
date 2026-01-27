<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$branch_id = $_GET['branch_id'] ?? null;

if(!$branch_id || $branch_id === 'undefined') {
  echo json_encode(["success" => false, "message" => "Branch ID missing"]);
  exit;
};

try {
  $pdo = (new Database())->pdo;
  $stmt = $pdo->prepare(
    "SELECT * FROM service_tb 
    WHERE service_id NOT IN (
      SELECT service_id FROM branch_service_tb WHERE branch_id = :branch_id
    ) ORDER BY name ASC"
  );
  $stmt->execute(['branch_id' => $branch_id]);
  $services = $stmt->fetchAll();

  echo json_encode(["success" => true, "data" => $services]);
} catch(Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}