<?php
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../middleware/auth-middleware.php';

$admin = validate_auth(['super_admin']);

$data = json_decode(file_get_contents("php://input"), true);

if(empty($data['name']) || empty($data['price'])) {
  echo json_encode(["success" => false, "message" => "Name and Price are required"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare("INSERT INTO subscription_tb (
    name, 
    price, 
    duration_months, 
    appointment_limit, 
    has_marketplace, 
    has_unlimited_email
  ) VALUES (
    :name, 
    :price, 
    :duration, 
    :appointment_limit, 
    :market, 
    :email
  )");
    
  $success = $stmt->execute([
    ':name' => $data['name'],
    ':price' => $data['price'],
    ':duration' => $data['duration_months'],
    ':appointment_limit' => $data['appointment_limit'],
    ':market' => $data['has_marketplace'] ? 1 : 0,
    ':email' => $data['has_unlimited_email'] ? 1 : 0
  ]);

  if($success) {
    echo json_encode(["success" => true, "message" => "New subscription plan created successfully"]);
  } else {
    echo json_encode(["success" => false, "message" => "Failed to create subscription plan"]);
  }

} catch(PDOException $e) {
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>