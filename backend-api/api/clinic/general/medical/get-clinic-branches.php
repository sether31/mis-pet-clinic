<?php
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';

// Allow all clinic-side roles to access, but frontend will restrict UI
$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

if(!isset($_GET['branch_id'])) {
  echo json_encode(["success" => false, "message" => "Branch ID required"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;

  // 1. Get the clinic_id of the current branch
  $stmt = $pdo->prepare("SELECT clinic_id FROM clinic_branches_tb WHERE branch_id = ?");
  $stmt->execute([$_GET['branch_id']]);
  $clinic = $stmt->fetch();

  if (!$clinic) throw new Exception("Clinic not found.");

  // 2. Fetch branches that are 'Approved' AND have at least one record in clinic_subscriptions_tb
  $stmt = $pdo->prepare("
      SELECT DISTINCT b.branch_id, b.name 
      FROM clinic_branches_tb b
      INNER JOIN clinic_subscriptions_tb s ON b.clinic_id = s.clinic_id
      WHERE b.clinic_id = :clinic_id 
      AND b.status = 'Approved'
  ");
  $stmt->execute([':clinic_id' => $clinic['clinic_id']]);
  $branches = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(["success" => true, "data" => $branches]);

} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}