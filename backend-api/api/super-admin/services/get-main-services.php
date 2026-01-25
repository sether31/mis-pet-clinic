<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

validate_auth(['super_admin']); 

try {
  $pdo = (new Database())->pdo;

  // count
  $statsStmt = $pdo->query(
    "SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as inactive
    FROM service_tb"
  );
  $stats = $statsStmt->fetch();

  // fetch data
  $listStmt = $pdo->query("SELECT * FROM service_tb ORDER BY created_at DESC");
  $services = $listStmt->fetchAll();

  echo json_encode([
    "success" => true,
    "cardData" => [
      "total" => (int)$stats['total'],
      "active" => (int)$stats['active'],
      "inactive" => (int)$stats['inactive']
    ],
    "data" => $services
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false, 
    "message" => "Internal Server Error: " . $e->getMessage()
  ]);
}