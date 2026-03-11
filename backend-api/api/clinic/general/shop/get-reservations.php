<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

$branch_id = $_GET['branch_id'] ?? null;

if(!$branch_id) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Branch ID is required."]);
  exit;
}

try {
  $pdo = (new Database)->pdo;

  $subCheck = $pdo->prepare(
    "SELECT s.has_shop 
    FROM branch_subscriptions_tb bs
    JOIN subscription_tb s ON bs.subscription_id = s.subscription_id
    WHERE bs.branch_id = ? AND bs.status = 'active'
    LIMIT 1"
  );
  $subCheck->execute([$branch_id]);
  $subscription = $subCheck->fetch();

  if(!$subscription || $subscription['has_shop'] == 0) {
    http_response_code(403);
    echo json_encode([
      "success" => false, 
      "message" => "Your current subscription plan does not include the Shop Management feature."
    ]);
    exit;
  }

  $stmt = $pdo->prepare(
    "SELECT 
      o.order_id, 
      o.order_status, 
      o.pickup_date, 
      o.total_amount, 
      o.cancellation_reason,
      u.first_name,         
      u.last_name, 
      u.profile_picture,            
      SUM(oi.quantity) AS quantity,
      MAX(p.name) AS product_name,
      MAX(p.prod_pic) AS prod_pic,  
      MAX(oi.price) AS unit_price
    FROM order_tb o
    JOIN user_tb u ON o.user_id = u.user_id  
    LEFT JOIN order_items_tb oi ON o.order_id = oi.order_id 
    LEFT JOIN products_tb p ON oi.product_id = p.product_id  
    WHERE o.branch_id = ?
    GROUP BY 
      o.order_id, 
      o.order_status, 
      o.pickup_date, 
      o.total_amount, 
      o.cancellation_reason,
      u.first_name,
      u.last_name,
      u.profile_picture,            
      o.created_at
    ORDER BY 
      CASE WHEN o.order_status = 'pending' THEN 1 ELSE 2 END,
      o.pickup_date ASC, 
      o.created_at DESC"
  );
  
  $stmt->execute([$branch_id]);
  $orders = $stmt->fetchAll();

  $cardData = [
    "pending" => 0,
    "confirmed" => 0,
    "completed" => 0,
    "rejected" => 0,
    "cancelled" => 0,
    "total" => count($orders)
  ];

  $formattedOrders = array_map(function($order) use (&$cardData) {
    $order['owner_name'] = trim(($order['first_name'] ?? '') . ' ' . ($order['last_name'] ?? 'Unknown User'));
    $order['product_name'] = $order['product_name'] ?? 'Multiple / Custom Items';
    $order['quantity'] = $order['quantity'] ?? 1;
    $order['unit_price'] = $order['unit_price'] ?? 0;

    $order['profile_picture'] = $order['profile_picture'] ?? null;
    $order['prod_pic'] = $order['prod_pic'] ?? null;

    $order['order_status'] = strtolower(trim($order['order_status']));

    // Count 
    $status = $order['order_status'];
    if ($status === 'pending') {
      $cardData['pending']++;
    } elseif ($status === 'confirmed') {
      $cardData['confirmed']++;
    } elseif ($status === 'completed') {
      $cardData['completed']++;
    } elseif ($status === 'cancelled') {
      $cardData['cancelled']++; 
    } elseif ($status === 'rejected') {
      $cardData['rejected']++; 
    }

    return $order;
  }, $orders);

  echo json_encode([
    "success" => true,
    "data" => $formattedOrders,
    "cardData" => $cardData 
  ]);

} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}
?>