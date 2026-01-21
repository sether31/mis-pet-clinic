<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

$admin = validate_auth(['super_admin']);

try {
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare("SELECT ps_id, platform_logo, platform_name, platform_email, contact_phone, is_maintenance FROM platform_settings_tb WHERE ps_id = 1");
  $stmt->execute();
    
  $settings = $stmt->fetch();

  if(!$settings) {
    // if no row exists return default
    echo json_encode([
      "success" => true,
        "data" => [
          "platform_name" => "Pet Clinic Platform",
          "platform_email" => "petclinicplatform@gmail.com",
          "contact_phone" => "0912 211 2111",
          "platform_logo" => null,
          "is_maintenance" => 0
        ]
      ]);
      exit();
    }

  echo json_encode([
    "success" => true,
    "data" => $settings
  ]);
} catch(Exception $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
}