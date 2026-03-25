<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

$admin = validate_auth(['super_admin']);

try {
$pdo = (new Database())->pdo;

// Using SELECT * will now include login_photo and maintenance_message
$stmt = $pdo->prepare("SELECT * FROM platform_settings_tb WHERE ps_id = 1");
$stmt->execute();
  
$settings = $stmt->fetch();

if(!$settings) {
  echo json_encode([
    "success" => true,
      "data" => [
        "platform_name" => "Pet Clinic Platform",
        "platform_email" => "petclinicplatform@gmail.com",
        "contact_phone" => "0912 211 2111",
        "platform_logo" => null,
        "login_photo" => null,        
        "is_maintenance" => 0,
        "maintenance_message" => ""   
      ]
    ]);
    exit();
  }

// Cast is_maintenance to integer explicitly for React consistency
$settings['is_maintenance'] = (int)$settings['is_maintenance'];

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