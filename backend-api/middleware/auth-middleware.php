<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}
header("Content-Type: application/json");

require_once __DIR__ . '/../vendor/autoload.php'; 

use Dotenv\Dotenv;
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

if(!isset($_ENV['JWT_SEC_KEY'])) {
  $dotenv = Dotenv::createImmutable(__DIR__ . '/../');
  $dotenv->load();
}

function validate_auth($allowed_roles = []) {
  $secret_key = $_ENV['JWT_SEC_KEY']; 

  // get the authorization
  $headers = apache_request_headers();
  $auth_header = $headers['Authorization'] ?? $headers['authorization'] ?? null;

  // check if bearer token exist
  if(!$auth_header || !preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Unauthorized: No token provided"]);
    exit;
  }
  // get token string 
  $jwt = $matches[1]; 

  try {
    // decode jwt
    $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));

    // 2. MAINTENANCE CHECK (The "Gatekeeper")
    // We only check maintenance if the user is NOT a super_admin
    if ($decoded->role !== 'super_admin') {
      require_once __DIR__ . '/../config/Database.php';
      $pdo = (new Database())->pdo;
      
      $stmt = $pdo->prepare("SELECT is_maintenance FROM platform_settings_tb WHERE ps_id = 1");
      $stmt->execute();
      $settings = $stmt->fetch();

      if ($settings && (int)$settings['is_maintenance'] === 1) {
        http_response_code(503); 
        echo json_encode([
          "success" => false, 
          "maintenance" => true, 
          "message" => "The platform is currently under maintenance. Please try again later."
        ]);
        exit;
      }
    }

    // check roles if allowed
    if(!empty($allowed_roles) && !in_array($decoded->role, $allowed_roles)) {
      http_response_code(403);
      echo json_encode(["success" => false, "message" => "Forbidden: You do not have permission"]);
      exit;
    }

    return $decoded;
  } catch(Exception $e) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Session expired or invalid"]);
    exit;
  }
}