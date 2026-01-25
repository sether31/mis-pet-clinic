<?php
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents('php://input'));

  $id = $data->branch_service_id ?? null;
  $status = $data->status ?? null; 

  if(!$id || $status === null) {
    throw new Exception("Missing required fields.");
  }

  $stmt = $pdo->prepare("UPDATE branch_service_tb SET status = ? WHERE branch_service_id = ?");
  $result = $stmt->execute([$status, $id]);

  if ($result) {
    echo json_encode(["success" => true, "message" => "Status updated successfully."]);
  } else {
    echo json_encode(["success" => false, "message" => "Failed to update status."]);
  }

} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}