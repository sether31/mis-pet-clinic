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

  // Fetch the branch_id and clinic_id BEFORE updating
  $stmtFetch = $pdo->prepare(
    "SELECT a.branch_id, b.clinic_id 
    FROM appointments_tb a
    LEFT JOIN clinic_branches_tb b ON a.branch_id = b.branch_id
    WHERE a.appointment_id = ? AND a.user_id = ?"
  );
  $stmtFetch->execute([$appointment_id, $user_id]);
  $appointment = $stmtFetch->fetch();

  if (!$appointment) {
    throw new Exception("Appointment not found or unauthorized.");
  }

  // Update the status
  $stmt = $pdo->prepare(
    "UPDATE appointments_tb 
    SET status = 'cancelled', feedback = 'cancelled by user' 
    WHERE appointment_id = ? 
    AND user_id = ? 
    AND status = 'pending'"
  );
  
  $stmt->execute([$appointment_id, $user_id]);

  if($stmt->rowCount() > 0) {
    log_audit(
      $pdo, 
      $user_id, 
      $appointment['clinic_id'], 
      $appointment['branch_id'], 
      'CANCEL', 
      'APPOINTMENT', 
      $appointment_id
    );
    
    echo json_encode(["success" => true, "message" => "Appointment Cancelled."]);
  } else {
    throw new Exception("Cannot cancel. Appointment may be confirmed or already processed.");
  }

} catch (Exception $e) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>