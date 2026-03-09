<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

try {
  $decoded = validate_auth(['pet_owner']);
  $userId = $decoded->user_id;
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare(
    "SELECT 
      o.order_id, 
      GROUP_CONCAT(p.name SEPARATOR ', ') as product_titles, 
      o.order_status, 
      o.pickup_date,
      cb.name as branch_name,
      (SELECT p2.prod_pic 
        FROM order_items_tb oi2 
        JOIN products_tb p2 ON oi2.product_id = p2.product_id 
        WHERE oi2.order_id = o.order_id 
        LIMIT 1) as main_image
    FROM order_tb o
    JOIN order_items_tb oi ON o.order_id = oi.order_id
    JOIN products_tb p ON oi.product_id = p.product_id
    JOIN clinic_branches_tb cb ON o.branch_id = cb.branch_id
    LEFT JOIN appointments_tb a ON o.order_id = a.order_id
    WHERE o.user_id = ? 
      AND a.order_id IS NULL 
      AND o.order_status IN ('pending', 'confirmed')
    GROUP BY o.order_id
    ORDER BY o.created_at DESC
    LIMIT 3"
  );

  $stmt->execute([$userId]);
  $orders = $stmt->fetchAll();

  $formattedPickups = [];

  foreach ($orders as $order) {
    $formattedPickups[] = [
      'order_id' => $order['order_id'],
      'product_name' => $order['product_titles'],
      'order_status' => $order['order_status'],
      'pickup_date' => $order['pickup_date'],
      'prod_pic' => $order['main_image'],
      'branch_name' => $order['branch_name']
    ];
  }

  echo json_encode([
    "success" => true,
    "data" => $formattedPickups
  ]);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false, 
    "message" => "Database error: " . $e->getMessage()
  ]);
}
?>