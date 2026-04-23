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
      pay.cash_received,
      pay.cash_change,
      inv.expiry_date,
      inv.supplier_name,
      inv.stock_level,
      -- FIX: Use the specific inventory_id linked in order_items_tb
      oi.inventory_id, 

      a.updated_at,
      CONCAT(u.first_name, ' ', u.last_name) as updated_by_name
    FROM appointments_tb a
    LEFT JOIN order_tb o ON a.order_id = o.order_id
    LEFT JOIN order_items_tb oi ON o.order_id = oi.order_id
    LEFT JOIN payments_tb pay ON o.order_id = pay.order_id
    LEFT JOIN products_tb p ON oi.product_id = p.product_id
    -- FIX: Join on the inventory_id specifically to avoid batch duplication
    LEFT JOIN inventory_tb inv ON oi.inventory_id = inv.inventory_id
    LEFT JOIN user_tb u ON a.last_updated_by = u.user_id
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

  $rawMethod = $items[0]['payment_method'];
  $paymentMethod = ($rawMethod === null) ? 'card' : strtolower($rawMethod);

  echo json_encode([
    "success" => true,
    "data" => $items,
    "payment_method" => $paymentMethod,
    "payment_status" => $items[0]['payment_status'],
    
    "updated_at" => $items[0]['updated_at'],
    "updated_by_name" => $items[0]['updated_by_name']
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false, 
    "message" => $e->getMessage()
  ]);
}