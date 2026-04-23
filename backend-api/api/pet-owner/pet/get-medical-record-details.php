<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php'; 

try {
  $owner = validate_auth(['pet_owner']);
  $userId = $owner->user_id ?? null;

  if(!$userId) throw new Exception("Unauthorized access.");
  if(!isset($_GET['record_id']) || empty($_GET['record_id'])) throw new Exception("Record ID is required.");

  $record_id = intval($_GET['record_id']);
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare(
    "SELECT 
      m.*, a.start_time, a.end_time, 
      cb.branch_id, cb.name AS branch_name, cb.logo_picture AS branch_image,
      u.first_name AS vet_first_name, u.last_name AS vet_last_name, u.profile_picture AS vet_image,
      o.order_id, o.total_amount, p.payment_method,
      serv.price AS base_service_price,
      
      -- GATEKEEPER 
      cb.is_maintenance,
      cb.status as clinic_status,
      (SELECT IF(COUNT(*) > 0, 1, 0) 
      FROM branch_subscriptions_tb bs 
      WHERE bs.branch_id = cb.branch_id 
        AND bs.status = 'active' 
        AND bs.end_date >= CURDATE()
      ) as has_active_sub
      
    FROM medrecord_tb m
    LEFT JOIN clinic_branches_tb cb ON m.branch_id = cb.branch_id
    LEFT JOIN branch_staff_tb bs ON m.vet_id = bs.staff_id 
    LEFT JOIN user_tb u ON bs.user_id = u.user_id
    LEFT JOIN appointments_tb a ON m.appointment_id = a.appointment_id 
    LEFT JOIN branch_service_tb serv ON a.service_id = serv.branch_service_id
    LEFT JOIN order_tb o ON a.order_id = o.order_id
    LEFT JOIN payments_tb p ON o.order_id = p.order_id
    WHERE m.medical_id = :record_id 
    LIMIT 1"
  );

  $stmt->execute([':record_id' => $record_id]);

  if($stmt->rowCount() > 0) {
    $record = $stmt->fetch(); 
    
    if (!empty($record['order_id'])) {
      $stmtItems = $pdo->prepare(
        "SELECT oi.quantity, oi.price, oi.subtotal,
        COALESCE(prod.name, serv.custom_name, 'Unknown Item') as item_name,
        prod.brand_name,
        prod.brand_type,
        prod.dosage
        FROM order_items_tb oi
        LEFT JOIN products_tb prod ON oi.product_id = prod.product_id
        LEFT JOIN branch_service_tb serv ON oi.service_id = serv.branch_service_id
        WHERE oi.order_id = ?"
      );
      $stmtItems->execute([$record['order_id']]);
      
      $record['items'] = $stmtItems->fetchAll();
    } else {
      $record['items'] = [];
    }

    if (ob_get_length()) ob_clean();
    echo json_encode(["success" => true, "data" => $record]);
  } else {
    echo json_encode(["success" => false, "message" => "Record not found."]);
  }
} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>