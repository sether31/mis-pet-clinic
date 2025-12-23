<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once __DIR__ . '/../../../config/Database.php';

$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['subscription_id'])) {
    echo json_encode(["success" => false, "message" => "Subscription ID is required for updates"]);
    exit;
}

try {
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare("UPDATE subscription_tb SET 
    name = :name, 
    price = :price, 
    duration_months = :duration, 
    appointment_limit = :appt, 
    has_marketplace = :market, 
    has_unlimited_email = :email,
    is_active = :is_active
  WHERE subscription_id = :id");
  
  $success = $stmt->execute([
    ':name'      => $data['name'],
    ':price'     => $data['price'],
    ':duration'  => $data['duration_months'],
    ':appt'      => $data['appointment_limit'],
    ':market'    => $data['has_marketplace'] ? 1 : 0,
    ':email'     => $data['has_unlimited_email'] ? 1 : 0,
    ':is_active' => isset($data['is_active']) ? (int)$data['is_active'] : 1,
    ':id'        => $data['subscription_id']
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