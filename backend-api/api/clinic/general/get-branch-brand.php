<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

$branch_id = $_GET['branch_id'] ?? null;

if(!$branch_id) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Branch ID is required."]);
  exit;
}

try {
  $pdo = (new Database)->pdo;
  
  $stmt = $pdo->prepare(
    "SELECT 
      b.logo_picture, 
      b.name,
      s.has_shop,
      s.has_medical
    FROM clinic_branches_tb b
    LEFT JOIN branch_subscriptions_tb bs ON b.branch_id = bs.branch_id AND bs.status = 'active'
    LEFT JOIN subscription_tb s ON bs.subscription_id = s.subscription_id
    WHERE b.branch_id = ?
    LIMIT 1"
  );
  $stmt->execute([$branch_id]);
  $branch = $stmt->fetch();

  if (!$branch) {
    throw new Exception("Branch not found.");
  }

  echo json_encode([
    "success" => true,
    "branch_name" => $branch['name'],
    "logo_picture" => $branch['logo_picture'],
    "has_shop" => $branch['has_shop'] ? (int)$branch['has_shop'] : 0,
    "has_medical" => $branch['has_medical'] ? (int)$branch['has_medical'] : 0
  ]);

} catch(Exception $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
}
?>