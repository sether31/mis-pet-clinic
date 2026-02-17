<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';

$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents('php://input'), true);

  $id = $data['branch_service_id'] ?? null;
  $status = $data['status'] ?? null; 

  if(!$id || $status === null) {
    throw new Exception("Missing required fields.");
  }

  $pdo->beginTransaction();

  // get branch id for audit
  $stmtDetails = $pdo->prepare("SELECT branch_id FROM branch_service_tb WHERE branch_service_id = ?");
  $stmtDetails->execute([$id]);
  $branch_id = $stmtDetails->fetchColumn();

  if(!$branch_id) {
    throw new Exception("Service not found.");
  }

  // get clinic id for audit
  $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinic_branches_tb WHERE branch_id = ?");
  $stmtClinic->execute([$branch_id]);
  $clinicId = $stmtClinic->fetchColumn() ?: 0;

  // update the status
  $stmt = $pdo->prepare("UPDATE branch_service_tb SET status = ? WHERE branch_service_id = ?");
  $stmt->execute([$status, $id]);

  // audit update service status
  $action = ($status == 1) ? 'RESTORE' : 'ARCHIVE';

  log_audit(
    $pdo, 
    $user->user_id, 
    $clinicId, 
    $branch_id, 
    $action, 
    'BRANCH_SERVICE', 
    $id
  );

  $pdo->commit();

  echo json_encode([
    "success" => true, 
    "message" => ($status == 1) ? "Service restored successfully." : "Service archived successfully."
  ]);

} catch(Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}