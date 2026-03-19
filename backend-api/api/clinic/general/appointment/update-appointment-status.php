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

  // Added a.staff_id to fetch the assigned vet/groomer
  $stmtDetails = $pdo->prepare(
      "SELECT a.branch_id, b.clinic_id, a.user_id, a.staff_id, 
        p.name AS pet_name, p.status AS pet_status, p.is_deceased, 
        b.name AS clinic_name, a.status AS current_status
      FROM appointments_tb a
      JOIN clinic_branches_tb b ON a.branch_id = b.branch_id
      JOIN pet_tb p ON a.pet_id = p.pet_id           
      WHERE a.appointment_id = ?"
    );
    $stmtDetails->execute([$appointment_id]);
    $details = $stmtDetails->fetch();

    if(!$details) {
      throw new Exception("Appointment not found.");
    }

    // 2. NEW: Check if pet is valid ONLY when confirming
    if ($status === 'confirmed') {
      if ((int)$details['is_deceased'] === 1) {
        throw new Exception("Cannot approve appointment. This pet has passed away.");
      }
      if ($details['pet_status'] === 0) {
        throw new Exception("Cannot approve appointment. This pet is currently inactive.");
      }
    }

  // Check if the appointment is already cancelled
  if ($details['current_status'] === 'cancelled') {
    throw new Exception("The pet owner has already cancelled this appointment. Please refresh your page");
  }

  $branchId = $details['branch_id'];
  $clinicId = $details['clinic_id'];
  $petOwnerId = $details['user_id'];
  $staffId = $details['staff_id'];
  $clinicName = $details['clinic_name'] ?? 'Veterinary Clinic';
  $petName = $details['pet_name'] ?? 'your pet';

  // UPDATE appointment status
  $stmt = $pdo->prepare(
    "UPDATE appointments_tb 
    SET status = :status, feedback = :feedback,
    last_updated_by = :last_updated_by
    WHERE appointment_id = :id"
  );

  $stmt->execute([
    ':status' => $status,
    ':feedback' => $feedback,
    ':last_updated_by' => $adminId,
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

  // 1. Notify Pet Owner
  $title = $clinicName; 
  $notificationMessage = "Your appointment for " . $petName . " has been " . $actionResponse . ".";
  
  if(!empty($feedback)) {
    $notificationMessage .= "\n\nClinic Note: " . $feedback;
  }

  send_notification($pdo, $petOwnerId, 'appointment', $title, $notificationMessage);

  // --- 🔔 NEW: NOTIFY ASSIGNED VET/GROOMER ---
  if(in_array(strtolower($status), ['confirmed', 'cancelled', 'rejected'])) {
    
    // Check if a specific staff member is assigned to this appointment
    if(!empty($staffId)) {
      
      // Get the user_id of this specific staff member
      $vetStmt = $pdo->prepare("SELECT user_id FROM branch_staff_tb WHERE staff_id = ? AND status = 1 LIMIT 1");
      $vetStmt->execute([$staffId]);
      $assignedUserId = $vetStmt->fetchColumn();

      // Notify them ONLY IF they exist AND they aren't the person who just clicked the button
      if ($assignedUserId && $assignedUserId != $adminId) {
        
        // 1. Fetch the name of the person who clicked the button
        $actorStmt = $pdo->prepare("SELECT first_name, last_name FROM user_tb WHERE user_id = ? LIMIT 1");
        $actorStmt->execute([$adminId]);
        $actor = $actorStmt->fetch(PDO::FETCH_ASSOC);
        
        // Fallback to 'Staff' just in case the name is empty
        $actorName = $actor ? trim($actor['first_name'] . ' ' . $actor['last_name']) : 'Staff';

        // 2. Add their name to the notification string
        $staffNotifTitle = "Appointment " . ucfirst($actionResponse);
        $staffNotifMsg = "The appointment for {$petName} has been {$actionResponse} by {$actorName}.";
        
        send_notification($pdo, $assignedUserId, 'appointment', $staffNotifTitle, $staffNotifMsg);
      }
    }
  }
  // ----

  $pdo->commit();

  echo json_encode([
    "success" => true, 
    "message" => "The appointment has been successfully " . $actionResponse . "."
  ]);

} catch(Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500); 
  $code = strpos($e->getMessage(), 'Action denied') !== false ? 400 : 500;
  http_response_code($code);
  
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>