<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

$decoded = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$data = json_decode(file_get_contents("php://input"), true);

$appointment_id = $data['appointment_id'] ?? null;
$status = $data['status'] ?? null;
$feedback = $data['feedback'] ?? null;

if(!$appointment_id || !$status) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Missing appointment ID or status"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;

  // check if the appointment exist
  $checkStmt = $pdo->prepare("SELECT status FROM appointments_tb WHERE appointment_id = :id");
  $checkStmt->execute([':id' => $appointment_id]);
  $currentStatus = $checkStmt->fetchColumn();

  if($currentStatus === false) {
    echo json_encode(["success" => false, "message" => "Appointment not found."]);
    exit;
  }

  // update appointment status
  $stmt = $pdo->prepare(
    "UPDATE appointments_tb 
     SET status = :status, feedback = :feedback
     WHERE appointment_id = :id"
  );

  $result = $stmt->execute([
    ':status' => $status,
    ':feedback' => $feedback,
    ':id' => $appointment_id
  ]);

  $readable_status = [
    'confirmed' => 'approved',
    'rejected'  => 'declined',
    'cancelled' => 'cancelled'
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