<?php
// check-subscription-history.php
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';

$decodedToken = validate_auth(['clinic_admin']);
$data = json_decode(file_get_contents("php://input"), true);
$branchId = $data['branch_id'] ?? null;

if(!$branchId) {
  throw new Exception("Branch ID is required.");
}

try {
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare(
    "SELECT 
      b.is_configured,
      (SELECT COUNT(*) FROM branch_subscriptions_tb s WHERE s.branch_id = b.branch_id) as sub_count
    FROM clinic_branches_tb b
    WHERE b.branch_id = ? 
    LIMIT 1"
  );
  
  $stmt->execute([$branchId]);
  $branchData = $stmt->fetch();

  if(!$branchData) {
    throw new Exception("Branch not found.");
  }

  echo json_encode([
    "success" => true,
    "hasSubHistory" => ($branchData['sub_count'] > 0),
    "is_configured" => (int)$branchData['is_configured']
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
}
?>