<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

$branch_id = $_GET['branch_id'];

if(!$branch_id) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Branch ID is required."]);
  exit;
}


try {
  $pdo = (new Database)->pdo;
  $stmt = $pdo->prepare("SELECT name FROM clinic_branches_tb WHERE branch_id = ?");
  $stmt->execute([$branch_id]);
  $branch = $stmt->fetch();

  echo json_encode([
    "success" => true,
    "branch_name" => $branch['name']
  ]);
} catch(Exception $e) {
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
}

?>