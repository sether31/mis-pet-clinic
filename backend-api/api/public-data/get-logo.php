<?php
ob_clean(); 
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

if($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

require_once __DIR__ . '/../../config/Database.php';

try {
  $pdo = (new Database())->pdo;
  $stmt = $pdo->prepare("SELECT platform_logo, platform_name, platform_email, contact_phone FROM platform_settings_tb WHERE ps_id = 1");
  $stmt->execute();
  
  $settings = $stmt->fetch();

  echo json_encode([
    "success" => true,
    "data" => $settings ?: [
      "platform_name" => "Pet Clinic", 
      "platform_logo" => null,
      "platform_email" => null,
      "contact_phone" => null
    ]
  ]);
} catch(Exception $e) {
  echo json_encode([
    "success" => false, 
    "message" => "Database error"
  ]);
}
?>