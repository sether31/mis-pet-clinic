<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';

$decoded = validate_auth(['pet_owner']); 

try {
  $pdo = (new Database())->pdo;
  $userId = $decoded->user_id;

  $stmt = $pdo->prepare(
    "SELECT 
      o.order_id, 
      o.total_amount, 
      o.pickup_date, 
      o.order_status, 
      o.cancellation_reason, 
      o.created_at,
      o.branch_id,
      b.name as branch_name,
      oi.product_id,
      oi.quantity, 
      p.name as product_name, 
      p.category, 
      p.prod_pic
    FROM order_tb o
    JOIN clinic_branches_tb b ON o.branch_id = b.branch_id
    JOIN order_items_tb oi ON o.order_id = oi.order_id
    JOIN products_tb p ON oi.product_id = p.product_id
    WHERE o.user_id = :uid
    ORDER BY o.created_at DESC"
  );
  
  $stmt->execute([':uid' => $userId]);
  $reservations = $stmt->fetchAll();

  http_response_code(200);
  echo json_encode([
    "success" => true,
    "data" => $reservations
  ]);

} catch(Throwable $e) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>