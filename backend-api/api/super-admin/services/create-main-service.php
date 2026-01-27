<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

validate_auth(['super_admin']); 

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents('php://input'), true);

  if(empty($data['name']) || empty($data['description']) || !isset($data['price']) || !isset($data['duration'])) {
    throw new Exception("Missing required service data.");
  }

  $name = ucwords(strtolower(trim($data['name'] ?? '')));
  $description = trim($data['description'] ?? '');
  $price = (float)$data['price'];
  $duration = (int)$data['duration'];

  // check if a service with the same name already exist
  $checkStmt = $pdo->prepare("SELECT service_id FROM service_tb WHERE name = ?");
  $checkStmt->execute([$name]);
  if($checkStmt->fetch()) {
    throw new Exception("A service with this name already exists in the master catalog.");
  }
  
  $stmt = $pdo->prepare(
    "INSERT INTO service_tb (name, description, price, duration) 
    VALUES (:name, :description, :price, :duration)"
  );
  $stmt->execute([
    ':name' => $name,
    ':description' => $description,
    ':price' => $price,
    ':duration' => $duration
  ]);

  $newId = $pdo->lastInsertId();

  echo json_encode([
    "success" => true,
    "message" => "Service created successfully.",
    "service_id" => $newId
  ]);

} catch(Exception $e) {
  $code = ($e->getMessage() === "A service with this name already exists in the service.") ? 400 : 500;
  http_response_code($code);
  echo json_encode([
    "success" => false, 
    "message" => $e->getMessage()
  ]);
}