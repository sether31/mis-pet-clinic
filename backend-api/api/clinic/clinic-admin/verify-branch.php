<?php
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../middleware/auth-middleware.php';

$admin = validate_auth(['clinic_admin']); 

$data = json_decode(file_get_contents("php://input"));

if(!isset($data->branch_id)) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Branch ID is required"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;

  // check if valid
  $stmt = $pdo->prepare(
    "SELECT b.branch_id, b.status 
    FROM clinic_branches_tb b
    INNER JOIN clinics_tb c ON b.clinic_id = c.clinic_id
    WHERE b.branch_id = :branch_id 
    AND c.created_by = :user_id 
    LIMIT 1"
  );

  $stmt->execute([
    ':branch_id' => $data->branch_id,
    ':user_id' => $admin->user_id
  ]);

  $branch = $stmt->fetch();

  if(!$branch) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Unauthorized access to this branch"]);
    exit;
  }

  // check if the branch is approved
  if($branch['status'] !== 'approved') {
    echo json_encode([
      "success" => false, 
      "message" => "This branch is " . $branch['status'] . ". Access restricted.",
      "status" => $branch['status']
    ]);
    exit;
  }

  echo json_encode([
    "success" => true, 
    "message" => "Access verified"
  ]);
} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
