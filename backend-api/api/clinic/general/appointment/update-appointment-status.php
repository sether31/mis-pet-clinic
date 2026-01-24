<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

$decoded = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$data = json_decode(file_get_contents("php://input"), true);

$appointment_id = $data['appointment_id'] ?? null;
$status = $data['status'] ?? null;

if(!$appointment_id || !$status) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Missing appointment ID or status"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare(
    "UPDATE appointments_tb 
    SET status = :status 
    WHERE appointment_id = :id"
  );

  $stmt->execute([
    ':status' => $status,
    ':id' => $appointment_id
  ]);

  // check if appointment exist
  if($stmt->rowCount() === 0) {
    echo json_encode([
      "success" => false, 
      "message" => "No changes made. Appointment not found or status already set to " . $status
    ]);
    exit;
  }

  $readable_status = [
    'confirmed' => 'approved',
    'rejected'  => 'declined'
  ];

  $action = $readable_status[$status] ?? $status;

  echo json_encode([
    "success" => true, 
    "message" => "The appointment has been successfully " . $action . "."
  ]);
} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}