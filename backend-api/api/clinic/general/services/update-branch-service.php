<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents('php://input'), true);

  if(empty($data['branch_service_id']) || empty($data['custom_name']) || empty($data['custom_description'])) {
    throw new Exception("Missing required service data.");
  }

  $stmt = $pdo->prepare(
    "UPDATE branch_service_tb 
    SET 
      custom_name = :name,
      custom_description = :description,
      price = :price,
      duration = :duration,
      assigned_role = :role
    WHERE branch_service_id = :bsid AND branch_id = :bid"
  );

  $stmt->execute([
    ':name' => $data['custom_name'],
    ':description' => $data['custom_description'] ?? '',
    ':price' => $data['price'],
    ':duration' => $data['duration'],
    ':role' => $data['assigned_role'],
    ':bsid' => $data['branch_service_id'],
    ':bid' => $data['branch_id']
  ]);

  if($stmt->rowCount() > 0) {
    echo json_encode([
      "success" => true, 
      "message" => "Service updated successfully."
    ]);
  } else {
    echo json_encode([
      "success" => true, 
      "message" => "No changes were made."
    ]);
  }

} catch(Exception $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false, 
    "message" => "Update failed: " . $e->getMessage()
  ]);
}