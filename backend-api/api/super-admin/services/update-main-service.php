<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

validate_auth(['super_admin']); 

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents('php://input'), true);

  if(empty($data['service_id'])) {
    throw new Exception("Missing Service ID.");
  }

  $service_id = (int)$data['service_id'];
  $name = ucwords(strtolower(trim($data['name'] ?? '')));
  $description = trim($data['description'] ?? '');
  $price = (float)($data['price'] ?? 0);
  $duration = (int)($data['duration'] ?? 0);

  if(empty($name) || empty($description) || empty($price) || empty($duration)) {
    throw new Exception("Missing required service data.");
  }

  // Check if the new name already exists on a diff service_id
  $nameCheck = $pdo->prepare("SELECT service_id FROM service_tb WHERE name = ? AND service_id != ?");
  $nameCheck->execute([$name, $service_id]);
  if($nameCheck->fetch()) {
    throw new Exception("Another service already uses the name '$name'.");
  }

  $stmt = $pdo->prepare(
    "UPDATE service_tb SET 
      name = :name, 
      description = :description, 
      price = :price, 
      duration = :duration
    WHERE service_id = :id"
  );
  $stmt->execute([
    ':name'  => $name,
    ':description' => $description,
    ':price' => $price,
    ':duration' => $duration,
    ':id' => $service_id
  ]);

  if($stmt->rowCount() === 0) {
    // This might happen if no changes were made, which isn't strictly an error.
    echo json_encode([
      "success" => true,
      "message" => "No changes were made or service not found."
    ]);
    exit;
  }

  echo json_encode([
    "success" => true,
    "message" => "Master service updated successfully."
  ]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false, 
    "message" => $e->getMessage()
  ]);
}