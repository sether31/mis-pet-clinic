<?php
require_once __DIR__ . '/../../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../../config/Database.php';
require_once __DIR__ . '/../../../../../helper/log_audit.php';

$decodedToken = validate_auth(['clinic_admin', 'branch_admin']);

$branchId = $_POST['branch_id'] ?? null;
$schedulesJson = $_POST['schedules'] ?? null;
$isMaintenance = $_POST['is_maintenance'] ?? 0;
$markConfigured = $_POST['mark_configured'] ?? 0;

if(!$branchId || !$schedulesJson) {
  echo json_encode(["success" => false, "message" => "Missing required data."]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  $schedules = json_decode($schedulesJson, true);
    
  $stmt = $pdo->prepare(
    "UPDATE branch_operating_hours_tb 
    SET 
      start_time = ?, 
      end_time = ?, 
      is_closed = ?
    WHERE branch_id = ? AND day_of_week = ?"
  );

  foreach ($schedules as $s) {
    $startTime = $s['start_time'] ?? null;
    $endTime   = $s['end_time']   ?? null;
    $isClosed  = $s['is_closed']  ?? 1; 


    if($isClosed == 1) {
      $startTime = null;
      $endTime = null;
    }

    $stmt->execute([
      $startTime, 
      $endTime,
      $isClosed,
      $branchId,
      $s['day_of_week']
    ]);
  }

  // update branch maintenance and config
  $updateBranchSql = "UPDATE clinic_branches_tb 
                      SET is_maintenance = ?, 
                        is_configured = CASE WHEN ? = 1 THEN 1 ELSE is_configured END 
                      WHERE branch_id = ?";
  
  $branchStmt = $pdo->prepare($updateBranchSql);
  $branchStmt->execute([$isMaintenance, $markConfigured, $branchId]);

  // get clinic
  $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinic_branches_tb WHERE branch_id = ?");
  $stmtClinic->execute([$branchId]);
  $clinicId = $stmtClinic->fetchColumn() ?: 0;

  // audit update branch settings schedule
  log_audit(
    $pdo, 
    $decodedToken->user_id, 
    $clinicId, 
    $branchId, 
    'UPDATE', 
    'BRANCH_SETTINGS_OPERATIONAL', 
    $branchId
  );

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Settings updated successfully!"]);

} catch(Exception $e) {
  if (isset($pdo)) $pdo->rollBack();
  echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>