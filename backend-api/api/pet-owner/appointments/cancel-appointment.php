<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../service/Jwt.php'; 
require_once __DIR__ . '/../../../helper/log_audit.php';
require_once __DIR__ . '/../../../helper/send_notification.php';


$decoded = validate_auth(['pet_owner']); 
$user_id = $decoded->user_id; 

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents("php://input"), true);
  $appointment_id = $data['appointment_id'] ?? null;

  if(!$appointment_id) {
    throw new Exception("Invalid request. No appointment ID provided.");
  }

  $stmtFetch = $pdo->prepare(
    "SELECT a.branch_id, b.clinic_id, a.staff_id, a.start_time, p.name as pet_name 
    FROM appointments_tb a
    LEFT JOIN clinic_branches_tb b ON a.branch_id = b.branch_id
    LEFT JOIN pet_tb p ON a.pet_id = p.pet_id
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
    AND status IN ('pending', 'confirmed')"
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
    
    // notif
    // Find the user_id of the assigned Vet/Groomer
    $staffUserStmt = $pdo->prepare("SELECT user_id FROM branch_staff_tb WHERE staff_id = ? LIMIT 1");
    $staffUserStmt->execute([$appointment['staff_id']]);
    $assignedUserId = $staffUserStmt->fetchColumn();

    if ($assignedUserId) {
      $formattedTime = date('M j \a\t g:i A', strtotime($appointment['start_time']));
      $petName = $appointment['pet_name'] ?? 'A pet';
      $notifTitle = "Appointment Cancelled";
      $notifMessage = "The booking for {$petName} on {$formattedTime} was cancelled by the owner.";

      send_notification($pdo, $assignedUserId, 'appointment', $notifTitle, $notifMessage);
    }

    echo json_encode(["success" => true, "message" => "Appointment Cancelled."]);
  } else {
    throw new Exception("Oops! The clinic just updated this booking. Please refresh to see the latest status.");
  }

} catch (Exception $e) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>