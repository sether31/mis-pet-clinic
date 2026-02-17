<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';

$decodedToken = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);
$adminId = $decodedToken->user_id;

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if(!isset($data['inventory_id']) || !isset($data['status'])) {
  echo json_encode(["success" => false, "message" => "Missing required information"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  $stmt = $pdo->prepare(
    "UPDATE inventory_tb 
    SET is_active = :status 
    WHERE inventory_id = :inventory_id"
  );

  $result = $stmt->execute([
    ':status' => $data['status'],
    ':inventory_id' => $data['inventory_id']
  ]);

  if($result) {
    $auditAction = ($data['status'] == 0) ? 'ARCHIVE' : 'RESTORE';
    
    log_audit(
      $pdo, 
      $adminId, 
      $clinicId, 
      $branchId, 
      $auditAction, 
      'INVENTORY', 
      $productId
    );

    $pdo->commit();
    $msg = $data['status'] == 1 ? "Product restored successfully" : "Product archived successfully";
    echo json_encode(["success" => true, "message" => $msg]);
  } else {
    echo json_encode(["success" => false, "message" => "Failed to update database"]);
  }

} catch(Exception $e) {
  echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}