<?php
require_once __DIR__ . '/../../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../../config/Database.php';

$decodedToken = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$branchId = $_GET['branch_id'] ?? null; 

if(!$branchId) {
  echo json_encode(["success" => false, "message" => "Branch ID required."]);
  exit;
}

try {
  $pdo = (new Database())->pdo;

  $branchStmt = $pdo->prepare("SELECT is_maintenance FROM clinic_branches_tb WHERE branch_id = ?");
  $branchStmt->execute([$branchId]);
  $branchStatus = $branchStmt->fetch(PDO::FETCH_ASSOC);

  if (!$branchStatus) {
    echo json_encode(["success" => false, "message" => "Branch not found."]);
    exit;
  }

  $stmt = $pdo->prepare(
    "SELECT 
      boh_id, 
      day_of_week, 
      TIME_FORMAT(start_time, '%H:%i') AS start_time,
      TIME_FORMAT(end_time, '%H:%i') AS end_time, 
      is_closed 
    FROM branch_operating_hours_tb 
    WHERE branch_id = ? 
    ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')"
  );
  $stmt->execute([$branchId]);
  $schedule = $stmt->fetchAll();

  echo json_encode([
    "success" => true, 
    "data" => [
      "is_maintenance" => $branchStatus['is_maintenance'],
      "schedules" => $schedule
    ]
  ]);

} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>