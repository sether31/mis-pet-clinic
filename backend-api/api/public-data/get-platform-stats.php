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
    ) as total_impact,

    (SELECT name FROM subscription_tb WHERE is_active = 1 ORDER BY price ASC LIMIT 1) as min_tier_name,
    (SELECT price FROM subscription_tb WHERE is_active = 1 ORDER BY price ASC LIMIT 1) as min_price,
    
    /* Get Highest Tier Name and Price */
    (SELECT name FROM subscription_tb WHERE is_active = 1 ORDER BY price DESC LIMIT 1) as max_tier_name,
    (SELECT price FROM subscription_tb WHERE is_active = 1 ORDER BY price DESC LIMIT 1) as max_price"
  );
  $stats = $stmtStats->fetch();

  $stmtShop = $pdo->query("SELECT name FROM subscription_tb WHERE has_shop = 1 AND is_active = 1 ORDER BY price ASC");
    $shopTiers = $stmtShop->fetchAll(PDO::FETCH_COLUMN);

  $stmt = $pdo->prepare("SELECT service_id, name FROM service_tb ORDER BY name ASC LIMIT 10");
  $stmt->execute();

  $services = $stmt->fetchAll();

  echo json_encode([
    "success" => true,
    "stats" => [
      "clinics" => (int)($stats['total_clinics'] ?? 0),
      "users" => (int)($stats['total_users'] ?? 0),
      "impact" => (int)($stats['total_impact'] ?? 0),
      "min_tier" => [
        "name" => $stats['min_tier_name'] ?? 'Basic',
        "price" => (float)($stats['min_price'] ?? 0)
      ],
      "max_tier" => [
        "name" => $stats['max_tier_name'] ?? 'Enterprise',
        "price" => (float)($stats['max_price'] ?? 0)
      ],
      "shop_tiers" => $shopTiers
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