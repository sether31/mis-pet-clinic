<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';

$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents('php://input'), true);
  $assigned_roles = json_encode($data['assigned_roles']);

  if(empty($data['branch_id']) || empty($data['custom_name']) || empty($data['custom_description'])) {
    throw new Exception("Missing required service data.");
  }

  $pdo->beginTransaction();

  // get clinic for audit
  $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinic_branches_tb WHERE branch_id = ?");
  $stmtClinic->execute([$data['branch_id']]);
  $clinicId = $stmtClinic->fetchColumn() ?: 0;

  // check if the service exists in the master table
  $stmtCheck = $pdo->prepare("SELECT service_id FROM service_tb WHERE name = :name LIMIT 1");
  $stmtCheck->execute([':name' => $data['custom_name']]);
  $masterService = $stmtCheck->fetch();

  if($masterService) {
    $serviceId = $masterService['service_id'];
  } else {
    // create in the master table if new
    $stmtMaster = $pdo->prepare(
      "INSERT INTO service_tb (name, description, price, duration) 
      VALUES (:name, :desc, :price, :duration)"
    );
    $stmtMaster->execute([
      ':name' => $data['custom_name'],
      ':desc' => $data['custom_description'],
      ':price' => $data['price'], 
      ':duration' => $data['duration']
    ]);
    $serviceId = $pdo->lastInsertId();
  }

  // link the master to the branch service
  $stmtBranch = $pdo->prepare(
    "INSERT INTO branch_service_tb (
      branch_id, service_id, custom_name, custom_description, price, duration, assigned_role
    ) VALUES (:bid, :sid, :name, :desc, :price, :duration, :role)"
  );

  $stmtBranch->execute([
    ':bid' => $data['branch_id'],
    ':sid' => $serviceId,
    ':name' => $data['custom_name'],
    ':desc' => $data['custom_description'],
    ':price' => $data['price'],
    ':duration' => $data['duration'],
    ':role' => $assigned_roles
  ]);
  $branchServiceId = $pdo->lastInsertId();

  log_audit(
    $pdo, 
    $user->user_id, 
    $clinicId, 
    $data['branch_id'], 
    'CREATE', 
    'BRANCH_SERVICE', 
    $branchServiceId
  );

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Service created successfully."]);

} catch(Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}