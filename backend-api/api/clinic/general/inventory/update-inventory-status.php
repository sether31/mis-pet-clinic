<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';

$decodedToken = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);
$adminId = $decodedToken->user_id;

$data = json_decode(file_get_contents("php://input"), true);

if(!isset($data['inventory_id']) || !isset($data['status'])) {
  echo json_encode(["success" => false, "message" => "Missing required information"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  // get for audit 
  $stmtDetails = $pdo->prepare(
    "SELECT i.branch_id, b.clinic_id 
    FROM inventory_tb i
    JOIN clinic_branches_tb b ON i.branch_id = b.branch_id
    WHERE i.inventory_id = :id"
  );
  $stmtDetails->execute([':id' => $data['inventory_id']]);
  $item = $stmtDetails->fetch();

  if(!$item) {
    throw new Exception("Product not found.");
  }

  // 👇 ADDED last_updated_by AND updated_at HERE 👇
  $stmt = $pdo->prepare(
    "UPDATE inventory_tb 
    SET is_active = :status, 
      last_updated_by = :admin_id, 
      updated_at = NOW()
    WHERE inventory_id = :inventory_id"
  );

  // 👇 Passed the admin ID into the array 👇
  $result = $stmt->execute([
    ':status' => $data['status'],
    ':admin_id' => $adminId,
    ':inventory_id' => $data['inventory_id']
  ]);

  if($result) {
    // $auditAction = ($data['status'] == 0) ? 'ARCHIVE' : 'RESTORE';
    
    // log_audit(
    //   $pdo, 
    //   $adminId, 
    //   $item['clinic_id'],  
    //   $item['branch_id'],  
    //   $auditAction, 
    //   'INVENTORY', 
    //   $data['inventory_id'] 
    // );

    $pdo->commit();
    $msg = $data['status'] == 1 ? "Product restored successfully" : "Product archived successfully";
    echo json_encode(["success" => true, "message" => $msg]);
  } else {
    echo json_encode(["success" => false, "message" => "Failed to update database"]);
  }

} catch(Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>