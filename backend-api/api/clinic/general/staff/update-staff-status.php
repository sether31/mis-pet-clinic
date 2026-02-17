<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';

$userToken = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$adminId = is_object($userToken) ? $userToken->user_id : $userToken['user_id'];

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if(!isset($data['user_id']) || !isset($data['branch_id']) || !isset($data['status'])) {
  echo json_encode(["success" => false, "message" => "Missing required information"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  // get clinic id for audit
  $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinic_branches_tb WHERE branch_id = ?");
  $stmtClinic->execute([$data['branch_id']]);
  $clinicId = $stmtClinic->fetchColumn() ?: 0;


  $stmt = $pdo->prepare(
    "UPDATE branch_staff_tb 
    SET status = :status 
    WHERE user_id = :user_id AND branch_id = :branch_id"
  );
  $stmt->execute([
    ':status' => $data['status'],
    ':user_id' => $data['user_id'],
    ':branch_id' => $data['branch_id']
  ]);


  $action = ($data['status'] == 1) ? 'RESTORE' : 'ARCHIVE';
  // audit update staff acc status
  log_audit(
    $pdo, 
    $adminId, 
    $clinicId, 
    $data['branch_id'], 
    $action, 
    'STAFF_MEMBER', 
    $data['user_id']
  );

  $pdo->commit();

  $msg = $data['status'] == 1 ? "Staff restored successfully" : "Staff archived successfully";
  echo json_encode(["success" => true, "message" => $msg]);

} catch(Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}