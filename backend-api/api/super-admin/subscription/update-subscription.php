<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

$admin = validate_auth(['super_admin']);

$data = json_decode(file_get_contents("php://input"), true);

if(empty($data['subscription_id'])) {
  echo json_encode(["success" => false, "message" => "Subscription ID is required for updates"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare("UPDATE subscription_tb SET 
    name = :name, 
    price = :price, 
    duration_months = :duration, 
    appointment_limit = :appointment, 
    has_shop = :has_shop, 
    has_email = :email,
    has_medical = :medical,
    is_active = :is_active
  WHERE subscription_id = :id");
  
  $success = $stmt->execute([
    ':name' => $data['name'],
    ':price' => $data['price'],
    ':duration' => $data['duration_months'],
    ':appointment' => $data['appointment_limit'],
    ':has_shop' => isset($data['has_shop']) ? (int)$data['has_shop'] : 0,
    ':email' => 1,
    ':medical' => 1,
    ':is_active' => isset($data['is_active']) ? (int)$data['is_active'] : 1,
    ':id' => $data['subscription_id']
  ]);

  if($success) {
    echo json_encode(["success" => true, "message" => "Subscription updated successfully"]);
  } else {
    echo json_encode(["success" => false, "message" => "No changes made or update failed"]);
  }
} catch (PDOException $e) {
  echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>