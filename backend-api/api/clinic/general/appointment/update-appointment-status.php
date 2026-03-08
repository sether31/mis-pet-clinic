<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';
require_once __DIR__ . '/../../../../helper/send_notification.php';

$decoded = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$adminId = $decoded->user_id;
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
  $pdo->beginTransaction();

  $stmtDetails = $pdo->prepare(
    "SELECT a.branch_id, b.clinic_id, a.user_id, p.name AS pet_name, b.name AS clinic_name
    FROM appointments_tb a
    JOIN clinic_branches_tb b ON a.branch_id = b.branch_id
    JOIN pet_tb p ON a.pet_id = p.pet_id           
    WHERE a.appointment_id = ?"
  );
  $stmtDetails->execute([$appointment_id]);
  $details = $stmtDetails->fetch();

  if(!$details) {
    echo json_encode(["success" => false, "message" => "Appointment not found."]);
    exit;
  }

  $branchId = $details['branch_id'];
  $clinicId = $details['clinic_id'];
  $petOwnerId = $details['user_id'];
  $clinicName = $details['clinic_name'] ?? 'Veterinary Clinic';
  $petName = $details['pet_name'] ?? 'your pet';

  // UPDATE appointment status
  $stmt = $pdo->prepare(
    "UPDATE appointments_tb 
    SET status = :status, feedback = :feedback
    WHERE appointment_id = :id"
  );

  $stmt->execute([
    ':status' => $status,
    ':feedback' => $feedback,
    ':id' => $appointment_id
  ]);

  // audit log
  $auditTag = 'APPOINTMENT_' . strtoupper($status);

  log_audit(
    $pdo, 
    $adminId, 
    $clinicId, 
    $branchId, 
    'UPDATE', 
    $auditTag, 
    $appointment_id
  );

  $readable_status = [
    'confirmed' => 'approved',
    'rejected'  => 'declined',
    'cancelled' => 'cancelled',
    'completed' => 'completed'
  ];

  $actionResponse = $readable_status[$status] ?? $status;

  // notif
  $title = $clinicName; 
  $notificationMessage = "Your appointment for " . $petName . " has been " . $actionResponse . ".";
  
  if (!empty($feedback)) {
    $notificationMessage .= "\n\nClinic Note: " . $feedback;
  }

  send_notification($pdo, $petOwnerId, 'appointment', $title, $notificationMessage);

  $pdo->commit();

  echo json_encode([
    "success" => true, 
    "message" => "The appointment has been successfully " . $actionResponse . "."
  ]);

} catch(Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}