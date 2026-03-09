<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';

$decoded = validate_auth(['pet_owner']); 
$user_id = $decoded->user_id; 

try {
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare(
    "SELECT 
      a.appointment_id, 
      a.start_time, 
      a.end_time,
      a.status,
      a.feedback,
      p.name as pet_name, 
      p.pet_picture,
      cb.branch_id,
      cb.name as branch_name,
      bs.custom_name as service_name,
      bs.price as service_fee,
      mr.medical_id as record_id,
      o.order_id,
      o.total_amount,
      
      -- GATEKEEPER 
      cb.is_maintenance,
      cb.status as clinic_status,
      (SELECT IF(COUNT(*) > 0, 1, 0) 
      FROM branch_subscriptions_tb sub 
      WHERE sub.branch_id = cb.branch_id 
        AND sub.status = 'active' 
        AND sub.end_date >= CURDATE()
      ) as has_active_sub
      
    FROM appointments_tb a
    LEFT JOIN pet_tb p ON a.pet_id = p.pet_id
    LEFT JOIN clinic_branches_tb cb ON a.branch_id = cb.branch_id
    LEFT JOIN branch_service_tb bs ON a.service_id = bs.branch_service_id
    LEFT JOIN medrecord_tb mr ON a.appointment_id = mr.appointment_id 
    LEFT JOIN order_tb o ON a.order_id = o.order_id
    WHERE a.user_id = ? 
    ORDER BY a.start_time DESC"
  );
  
  $stmt->execute([$user_id]);
  $appointments = $stmt->fetchAll();

  foreach ($appointments as &$appt) {
    if (!empty($appt['order_id'])) {
      $stmtItems = $pdo->prepare(
        "SELECT 
          oi.quantity, 
          oi.price, 
          oi.subtotal,
          COALESCE(prod.name, serv.custom_name, 'Unknown Item') as item_name
        FROM order_items_tb oi
        LEFT JOIN products_tb prod ON oi.product_id = prod.product_id
        LEFT JOIN branch_service_tb serv ON oi.service_id = serv.branch_service_id
        WHERE oi.order_id = ?"
      );
      $stmtItems->execute([$appt['order_id']]);
      $appt['items'] = $stmtItems->fetchAll();
    } else {
      $appt['items'] = [];
    }
  }

  echo json_encode([
    "success" => true,
    "data" => $appointments ?: []
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>