<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$data = json_decode(file_get_contents("php://input"));

if(!isset($data->branch_id)) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Branch ID required"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare(
    "SELECT 
      cb.branch_id, 
      cb.status as branch_status,
      (SELECT COUNT(*) FROM branch_subscriptions_tb WHERE branch_id = cb.branch_id) as sub_count
    FROM clinic_branches_tb cb
    INNER JOIN clinics_tb c ON cb.clinic_id = c.clinic_id
    LEFT JOIN branch_staff_tb bs ON cb.branch_id = bs.branch_id AND bs.user_id = :user_id
    WHERE cb.branch_id = :branch_id 
    AND (c.created_by = :user_id OR bs.user_id = :user_id)
    LIMIT 1"
  );

  $stmt->execute([
    ':branch_id' => $data->branch_id,
    ':user_id' => $user->user_id
  ]);

  $result = $stmt->fetch();

  // check if unauthorized like wrong branch id
  if(!$result) {
    echo json_encode([
      "success" => false, 
      "reason" => "unauthorized",
      "role" => $user->role 
    ]);
    exit;
  }

  // check if branch is not approved
  if($result['branch_status'] !== 'approved') {
    echo json_encode([
      "success" => false, 
      "reason" => "not_approved",
      "role" => $user->role
    ]);
    exit;
  }

  // check even if have past subscription history
  echo json_encode([
    "success" => true, 
    "hasSubscription" => (int)$result['sub_count'] > 0,
    "role" => $user->role
  ]);
} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Server Error"]);
}