<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if(!isset($data['user_id']) || !isset($data['branch_id']) || !isset($data['status'])) {
  echo json_encode(["success" => false, "message" => "Missing required information"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare(
    "UPDATE branch_staff_tb 
    SET status = :status 
    WHERE user_id = :user_id AND branch_id = :branch_id"
  );
  $result = $stmt->execute([
    ':status' => $data['status'],
    ':user_id' => $data['user_id'],
    ':branch_id' => $data['branch_id']
  ]);

  if($result) {
    $msg = $data['status'] == 1 ? "Staff restored successfully" : "Staff archived successfully";
    echo json_encode(["success" => true, "message" => $msg]);
  } else {
    echo json_encode(["success" => false, "message" => "Failed to update database"]);
  }

} catch(Exception $e) {
  echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}