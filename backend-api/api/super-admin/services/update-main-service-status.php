<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

validate_auth(['super_admin']); 

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents('php://input'), true);

  if(!isset($data['service_id']) || !isset($data['status'])) {
    throw new Exception("Missing Service ID or Status.");
  }

  $serviceId = (int)$data['service_id'];
  $status = (int)$data['status'];

  $stmt = $pdo->prepare("UPDATE service_tb SET status = :status WHERE service_id = :id");
  $stmt->execute([
    ':status' => $status,
    ':id' => $serviceId
  ]);

  if($stmt->rowCount() > 0) {
    $msg = ($status === 1) ? "Service is activated successfully." : "Service is moved to pending/archived.";
    
    echo json_encode([
      "success" => true,
      "message" => $msg
    ]);
  } else {
    echo json_encode([
      "success" => false,
      "message" => "No changes were made or service not found."
    ]);
  }

} catch(Exception $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false, 
    "message" => "Update failed: " . $e->getMessage()
  ]);
}