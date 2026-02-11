<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);

try {
  $pdo = (new Database())->pdo;
  $appointment_id = isset($_GET['appointment_id']) ? $_GET['appointment_id'] : null;

  if (!$appointment_id) {
    throw new Exception("Missing appointment ID.");
  }

  $stmt = $pdo->prepare(
    "SELECT 
      oi.product_id, 
      oi.service_id, 
      COALESCE(p.name, 'Service') AS name, 
      oi.price, 
      oi.quantity AS qty,
      pay.payment_method,
      pay.payment_status,
      -- Fetching these from the inventory table
      inv.expiry_date,
      inv.supplier_name,
      inv.stock_level,
      -- Use product_id as the fallback for inventory_id if missing
      COALESCE(inv.inventory_id, oi.product_id) as inventory_id
    FROM appointments_tb a
    INNER JOIN order_tb o ON a.order_id = o.order_id
    INNER JOIN order_items_tb oi ON o.order_id = oi.order_id
    LEFT JOIN payments_tb pay ON o.order_id = pay.order_id
    LEFT JOIN products_tb p ON oi.product_id = p.product_id
    -- Join inventory based on product_id
    LEFT JOIN inventory_tb inv ON oi.product_id = inv.product_id
    WHERE a.appointment_id = ?"
  );
  $stmt->execute([$appointment_id]);
  $items = $stmt->fetchAll();

  if(!$items) {
    echo json_encode([
      "success" => false, 
      "message" => "No billing records found for this appointment."
    ]);
    exit;
}  

  // Handle payment method labeling
  // get null value from the db if null then it is card
  $rawMethod = $items[0]['payment_method'];
  $paymentMethod = ($rawMethod === null) ? 'card' : strtolower($rawMethod);

  echo json_encode([
    "success" => true,
    "data" => $items,
    "payment_method" => $paymentMethod,
    "payment_status" => $items[0]['payment_status']
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false, 
    "message" => $e->getMessage()
  ]);
}