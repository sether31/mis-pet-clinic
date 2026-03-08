<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

try {
  $owner = validate_auth(['pet_owner']); 
  $userId = $owner->user_id ?? null;

  if(!$userId) {
    throw new Exception("Unauthorized access.");
  }

  $petId = $_GET['pet_id'] ?? null;
  if(!$petId) {
    throw new Exception("Pet ID is missing.");
  }

  $pdo = (new Database())->pdo;

  $stmtCheck = $pdo->prepare("SELECT pet_id FROM pet_tb WHERE pet_id = :pet_id AND owner_id = :owner_id LIMIT 1");
  $stmtCheck->execute([':pet_id' => $petId, ':owner_id' => $userId]);
  if(!$stmtCheck->fetch()) {
    throw new Exception("Pet not found or unauthorized.");
  }

  // get all recorded
  $stmtRecords = $pdo->prepare(
    "SELECT medical_id, record_date, service_name_at_time, diagnosis, treatment, 
      record_type, med_image_1, med_image_2, med_doc_1, med_doc_2
    FROM medrecord_tb 
    WHERE pet_id = :pet_id 
      AND record_type IS NOT NULL 
      AND record_type != 'unset'
    ORDER BY record_date DESC" 
  );
  
  $stmtRecords->execute([':pet_id' => $petId]);
  $records = $stmtRecords->fetchAll();

  echo json_encode([
    "success" => true,
    "data" => $records
  ]);

} catch(Exception $e) {
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
}
?>