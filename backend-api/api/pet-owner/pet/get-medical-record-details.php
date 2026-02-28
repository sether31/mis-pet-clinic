<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php'; 

try {
  $owner = validate_auth(['pet_owner']);
  $userId = $owner->user_id ?? null;

  if(!$userId) {
    throw new Exception("Unauthorized access.");
  }

  if(!isset($_GET['record_id']) || empty($_GET['record_id'])) {
    throw new Exception("Record ID is required.");
  }

  $record_id = intval($_GET['record_id']);

  $pdo = (new Database())->pdo;

  // get med details
  $stmt = $pdo->prepare(
    "SELECT 
      m.medical_id, 
      m.pet_id,
      m.appointment_id,
      m.service_name_at_time, 
      m.record_date, 
      m.diagnosis, 
      m.treatment, 
      m.record_type, 
      m.med_image_1, 
      m.med_image_2, 
      m.med_doc_1, 
      m.med_doc_2,
      m.created_at,  
      m.updated_at,   
      a.start_time, 
      a.end_time,   
      cb.name AS branch_name,
      cb.logo_picture AS branch_image,
      u.first_name AS vet_first_name,
      u.last_name AS vet_last_name,
      u.profile_picture AS vet_image
    FROM medrecord_tb m
    LEFT JOIN clinic_branches_tb cb ON m.branch_id = cb.branch_id
    LEFT JOIN branch_staff_tb bs ON m.vet_id = bs.staff_id 
    LEFT JOIN user_tb u ON bs.user_id = u.user_id
    LEFT JOIN appointments_tb a ON m.appointment_id = a.appointment_id 
    WHERE m.medical_id = :record_id 
    LIMIT 1"
  );
  
  $stmt->execute([':record_id' => $record_id]);

  if($stmt->rowCount() > 0) {
    $record = $stmt->fetch(); 
    echo json_encode([
      "success" => true,
      "data" => $record
    ]);
  } else {
    echo json_encode([
      "success" => false, 
      "message" => "Record not found."
    ]);
  }

} catch(Exception $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false, 
    "message" => "Server error: " . $e->getMessage()
  ]);
}
?>