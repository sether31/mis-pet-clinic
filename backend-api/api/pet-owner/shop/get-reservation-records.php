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
      o.order_status, 
      o.pickup_date,
      o.total_amount,
      o.cancellation_reason,
      cb.name as branch_name,
      cb.branch_id,
      
      -- Check Maintenance
      cb.is_maintenance, 
      
      -- Check Clinic Approval Status
      cb.status as clinic_status, 
      
      -- Check Active Subscription (Returns 1 if active, 0 if expired/none)
      (SELECT IF(COUNT(*) > 0, 1, 0) 
      FROM branch_subscriptions_tb bs 
      WHERE bs.branch_id = cb.branch_id 
        AND bs.status = 'active' 
        AND bs.end_date >= CURDATE()
      ) as has_active_sub,

      GROUP_CONCAT(p.name SEPARATOR ', ') as product_names,
      SUM(oi.quantity) as total_qty,
      (SELECT p2.prod_pic FROM order_items_tb oi2 
        JOIN products_tb p2 ON oi2.product_id = p2.product_id 
        WHERE oi2.order_id = o.order_id LIMIT 1) as main_pic,
      (SELECT oi3.product_id FROM order_items_tb oi3 
        WHERE oi3.order_id = o.order_id LIMIT 1) as product_id 
    FROM order_tb o
    JOIN order_items_tb oi ON o.order_id = oi.order_id
    JOIN products_tb p ON oi.product_id = p.product_id
    JOIN clinic_branches_tb cb ON o.branch_id = cb.branch_id
    LEFT JOIN appointments_tb a ON o.order_id = a.order_id
    WHERE o.user_id = ? 
      AND a.order_id IS NULL 
    GROUP BY o.order_id
    ORDER BY o.created_at DESC"
  );

  $stmt->execute([$userId]);
  $orders = $stmt->fetchAll();

  $formatted = [];
  foreach ($orders as $order) {
    $formatted[] = [
      'order_id' => $order['order_id'],
      'product_name' => $order['product_names'],
      'order_status' => $order['order_status'],
      'pickup_date' => $order['pickup_date'],
      'total_amount' => $order['total_amount'], 
      'quantity' => $order['total_qty'],    
      'prod_pic' => $order['main_pic'],
      'branch_name' => $order['branch_name'],
      'branch_id' => $order['branch_id'],
      'product_id' => $order['product_id'],
      'cancellation_reason' => $order['cancellation_reason'],
      
      'is_maintenance' => $order['is_maintenance'],
      'clinic_status' => $order['clinic_status'],
      'has_active_sub' => $order['has_active_sub']
    ];
  }

  if (ob_get_length()) ob_clean();
  echo json_encode(["success" => true, "data" => $formatted]);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>