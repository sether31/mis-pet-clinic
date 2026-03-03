<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../service/Jwt.php'; 

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
      mr.medical_id as record_id 
    FROM appointments_tb a
    LEFT JOIN pet_tb p ON a.pet_id = p.pet_id
    LEFT JOIN clinic_branches_tb cb ON a.branch_id = cb.branch_id
    LEFT JOIN branch_service_tb bs ON a.service_id = bs.branch_service_id
    LEFT JOIN medrecord_tb mr ON a.appointment_id = mr.appointment_id 
    WHERE a.user_id = ? 
    ORDER BY a.start_time DESC"
  );
  
  $stmt->execute([$user_id]);
  
  $appointments = $stmt->fetchAll();

  echo json_encode([
    "success" => true,
    "data" => $appointments ?: []
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>