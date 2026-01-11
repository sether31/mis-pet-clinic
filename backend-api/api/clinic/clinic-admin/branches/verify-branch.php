<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

$admin = validate_auth(['clinic_admin']); 
$data = json_decode(file_get_contents("php://input"));

if(!isset($data->branch_id)) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Branch ID required"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  // check if the user have this branch
  $stmt = $pdo->prepare(
    "SELECT 
      cb.branch_id, 
      bs.branch_sub_id
    FROM clinic_branches_tb cb
    INNER JOIN clinics_tb c ON cb.clinic_id = c.clinic_id
    LEFT JOIN branch_subscriptions_tb bs ON cb.branch_id = bs.branch_id 
    WHERE cb.branch_id = :branch_id 
    AND c.created_by = :user_id 
    ORDER BY bs.created_at DESC LIMIT 1" 
  );

  $stmt->execute([
    ':branch_id' => $data->branch_id,
    ':user_id' => $admin->user_id
  ]);

  $result = $stmt->fetch();

  if(!$result) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Unauthorized access or branch not found"]);
    exit;
  }

  // check if branch_sub_id is not null, if yes then it is not a new user 
  $hasSubscription = !empty($result['branch_sub_id']);

  echo json_encode([
    "success" => true, 
    "hasSubscription" => $hasSubscription
  ]);

} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Server Error: " . $e->getMessage()]);
}