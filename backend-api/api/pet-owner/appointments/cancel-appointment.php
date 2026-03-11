<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../service/Jwt.php'; 
require_once __DIR__ . '/../../../helper/log_audit.php';

$decoded = validate_auth(['pet_owner']); 
$user_id = $decoded->user_id; 

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents("php://input"), true);
  $appointment_id = $data['appointment_id'] ?? null;

  if(!$appointment_id) {
    throw new Exception("Invalid request. No appointment ID provided.");
  }

  // Update the status to 'cancelled'
  $stmt = $pdo->prepare(
    "UPDATE appointments_tb 
    SET status = 'cancelled' 
    WHERE appointment_id = ? 
    AND user_id = ? 
    AND status = 'pending'"
  );
  
  $stmt->execute([$appointment_id, $user_id]);

  // Check if a row was actually updated
  if($stmt->rowCount() > 0) {
    log_audit($pdo, $user_id, null, $appointment['branch_id'], 'CANCEL', 'APPOINTMENT', $appointment_id);
    echo json_encode(["success" => true, "message" => "Appointment Cancelled."]);
  } else {
    throw new Exception("Cannot cancel. Appointment may be confirmed or already processed.");
  }

} catch (Exception $e) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>