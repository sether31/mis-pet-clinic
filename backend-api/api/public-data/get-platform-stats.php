<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

if($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

require_once __DIR__ . '/../../config/Database.php';

try {
  $pdo = (new Database())->pdo;
  
  $stmtStats = $pdo->query(
    "SELECT 
    (SELECT COUNT(*) FROM clinic_branches_tb WHERE status = 'approved') as total_clinics,

    (SELECT COUNT(*) FROM user_tb WHERE status = 'approved') as total_users,

    (
      (SELECT COUNT(*) FROM appointments_tb WHERE status = 'completed') + 
      (SELECT COUNT(*) FROM order_tb WHERE order_status = 'completed' AND pickup_date IS NOT NULL)
    ) as total_impact"
  );
  $stats = $stmtStats->fetch();

  $stmt = $pdo->prepare("SELECT service_id, name FROM service_tb ORDER BY name ASC LIMIT 10");
  $stmt->execute();

  $services = $stmt->fetchAll();

  echo json_encode([
    "success" => true,
    "stats" => [
      "clinics" => (int)($stats['total_clinics'] ?? 0),
      "users" => (int)($stats['total_users'] ?? 0),
      "impact" => (int)($stats['total_impact'] ?? 0) 
    ],
    "services" => $services
  ]);

} catch(Exception $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false, 
    "message" => "Database error: " . $e->getMessage()
  ]);
}
?>