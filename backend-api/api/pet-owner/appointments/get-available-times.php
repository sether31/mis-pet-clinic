<?php
ob_clean();
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';

$decoded = validate_auth(['pet_owner']); 
header('Content-Type: application/json');

try {
  $pdo = (new Database())->pdo;

  if (!isset($_GET['branch_id'], $_GET['date'], $_GET['branch_service_id'], $_GET['staff_id'])) {
    throw new Exception("Missing required parameters.");
  }

  $branch_id = $_GET['branch_id'];
  $date = $_GET['date']; 
  $branch_service_id = $_GET['branch_service_id'];
  $staff_id = $_GET['staff_id'];
  $dayOfWeek = date('l', strtotime($date));

  // Get Branch Operating Hours
  $stmtBranch = $pdo->prepare("SELECT start_time, end_time, is_closed FROM branch_operating_hours_tb WHERE branch_id = ? AND day_of_week = ? LIMIT 1");
  $stmtBranch->execute([$branch_id, $dayOfWeek]);
  $branchHours = $stmtBranch->fetch();

  if(!$branchHours || $branchHours['is_closed'] == 1) {
    echo json_encode(["success" => true, "data" => []]); exit;
  }

  // Get Staff Schedule
  $stmtStaff = $pdo->prepare("SELECT start_time, end_time, is_available FROM branch_staff_schedule_tb WHERE staff_id = ? AND day_of_week = ? LIMIT 1");
  $stmtStaff->execute([$staff_id, $dayOfWeek]);
  $staffHours = $stmtStaff->fetch();

  // Fallback to branch hours if no specific staff schedule exists
  $startH = $staffHours ? $staffHours['start_time'] : $branchHours['start_time'];
  $endH = $staffHours ? $staffHours['end_time'] : $branchHours['end_time'];
  
  if($staffHours && $staffHours['is_available'] == 0) {
    echo json_encode(["success" => true, "data" => []]); exit;
  }

  // Get Service Duration
  $stmtSrv = $pdo->prepare("SELECT duration FROM branch_service_tb WHERE branch_service_id = ? LIMIT 1");
  $stmtSrv->execute([$branch_service_id]);
  $duration = (int)($stmtSrv->fetchColumn() ?: 30);

  // Get Existing Appointments for Collision Detection
  $stmtAppts = $pdo->prepare("SELECT start_time, end_time FROM appointments_tb WHERE staff_id = ? AND DATE(start_time) = ? AND status NOT IN ('cancelled', 'rejected')");
  $stmtAppts->execute([$staff_id, $date]);
  $existing = $stmtAppts->fetchAll();

  // Generate Slots
  $currentPointer = max(strtotime("$date $startH"), time());
  $endPointer = strtotime("$date $endH");
  $availableSlots = [];


  $slotStart = strtotime("$date $startH"); 

  while(($slotStart + ($duration * 60)) <= $endPointer) {
    $slotEnd = $slotStart + ($duration * 60);
    $isAvailable = true;
    $reason = "";

    // Check if in the past
    if ($slotStart < time()) {
      $isAvailable = false;
      $reason = "past";
    }

    // Check for collisions
    if ($isAvailable) {
      foreach ($existing as $appt) {
        $aStart = strtotime($appt['start_time']);
        $aEnd = strtotime($appt['end_time']);
        if ($slotStart < $aEnd && $slotEnd > $aStart) {
          $isAvailable = false;
          $reason = "booked";
          break;
        }
      }
    }

    $availableSlots[] = [
      "start" => date('H:i:s', $slotStart),
      "time_display" => date('h:i A', $slotStart),
      "full_display" => date('h:i A', $slotStart) . " - " . date('h:i A', $slotEnd),
      "is_available" => $isAvailable,
      "reason" => $reason
    ];
    $slotStart += ($duration * 60);
  }

  echo json_encode(["success" => true, "data" => $availableSlots]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>