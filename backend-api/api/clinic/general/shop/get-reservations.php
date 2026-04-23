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

  // 1. Subscription Check
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

  // 2. Fetch all orders (excluding appointment-linked ones)
  $stmt = $pdo->prepare(
  "SELECT 
    o.order_id, 
    o.order_status, 
    o.pickup_date, 
    o.total_amount, 
    pay.cash_received,   -- Selected from payments_tb instead of order_tb
    pay.cash_change,     -- Selected from payments_tb instead of order_tb
    o.cancellation_reason,
    u.first_name,         
    u.last_name, 
    u.profile_picture,            
    o.updated_at,
    o.created_at,
    CONCAT(u_updater.first_name, ' ', u_updater.last_name) AS updated_by_name
  FROM order_tb o
  LEFT JOIN user_tb u ON o.user_id = u.user_id 
  LEFT JOIN appointments_tb a ON o.order_id = a.order_id 
  LEFT JOIN user_tb u_updater ON o.last_updated_by = u_updater.user_id
  LEFT JOIN payments_tb pay ON o.order_id = pay.order_id -- Join to get cash details
  WHERE o.branch_id = ?
  AND a.appointment_id IS NULL
  ORDER BY 
    CASE WHEN o.order_status = 'pending' THEN 1 ELSE 2 END,
    o.pickup_date ASC, 
    o.created_at DESC"
);

$stmt->execute([$branch_id]);
$orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // 3. Fetch all items related to these specific orders
  $itemsByOrder = [];
  if (!empty($orders)) {
      $orderIds = array_column($orders, 'order_id');
      $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
      
      $itemStmt = $pdo->prepare(
        "SELECT 
          oi.*, 
          p.name AS product_name, 
          p.prod_pic, 
          p.brand_name, 
          p.brand_type, 
          p.dosage 
         FROM order_items_tb oi
         JOIN products_tb p ON oi.product_id = p.product_id
         WHERE oi.order_id IN ($placeholders)"
      );
      $itemStmt->execute($orderIds);
      $allItems = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

      // Group items by order_id for easy lookup
      foreach ($allItems as $item) {
          $itemsByOrder[$item['order_id']][] = $item;
      }
  }

  // 4. Statistics counter
  $cardData = [
    "pending" => 0,
    "confirmed" => 0,
    "completed" => 0,
    "rejected" => 0,
    "cancelled" => 0,
    "total" => count($orders)
  ];

  // 5. Format the Final Response
  $formattedOrders = array_map(function($order) use (&$itemsByOrder, &$cardData) {
    // Determine Owner Name
    $order['owner_name'] = trim(($order['first_name'] ?? '') . ' ' . ($order['last_name'] ?? '')) ?: null;
    
    // Attach Nested Items (for Modal)
    $order['items'] = $itemsByOrder[$order['order_id']] ?? [];
    
    // Flattened data fallback (for Table View)
    if (!empty($order['items'])) {
        $firstItem = $order['items'][0];
        $order['product_name'] = count($order['items']) > 1 
            ? implode(', ', array_column($order['items'], 'product_name')) 
            : $firstItem['product_name'];
            
        $order['quantity'] = array_sum(array_column($order['items'], 'quantity'));
        $order['prod_pic'] = $firstItem['prod_pic'];
        $order['unit_price'] = $firstItem['price'];
        $order['brand_name'] = $firstItem['brand_name'];
        $order['brand_type'] = $firstItem['brand_type'];
        $order['dosage'] = $firstItem['dosage'];
    } else {
        $order['product_name'] = 'No Items Found';
        $order['quantity'] = 0;
    }

    // Update Card Stats
    $status = strtolower(trim($order['order_status']));
    if (isset($cardData[$status])) {
        $cardData[$status]++;
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