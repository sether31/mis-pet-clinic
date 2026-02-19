<?php
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
  http_response_code(200);
  exit();
}

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../service/Otp.php';
require_once __DIR__ . '/../../service/MailService.php';
require_once __DIR__ . '/../../helper/log_audit.php';

$pdo = (new Database())->pdo;
$dataInput = json_decode(file_get_contents("php://input"), true);

$email = $dataInput["email"] ?? null;
$platform = "web"; 

if(!$email) {
  echo json_encode(["success" => false, "message" => "Email is required"]);
  exit;
}

$stmt = $pdo->prepare(
  "SELECT u.user_id, u.email, u.first_name, r.role_name 
  FROM user_tb u 
  JOIN roles_tb r ON u.role_id = r.role_id 
  WHERE u.email = :email 
  LIMIT 1"
);
$stmt->execute([":email" => $email]);
$user = $stmt->fetch();

if (!$user) {
  echo json_encode(["success" => false, "message" => "No account found with that email"]);
  exit;
}

// only allowed roles
$allowedRoles = ['super_admin'];

if(!in_array($user['role_name'], $allowedRoles)) {
  echo json_encode(["success" => false, "message" => "Access not allowed for this platform"]);
  exit;
}

// generate otp
$otpData = generateOtp($user['user_id'], 'password_reset', 5);

// send email
sendMailOTP(
  $user['email'],
  $otpData['otp'],
  $user['first_name'],
  'password_reset',
  $otpData['expires_at']
);

// audit req reset pass
log_audit($pdo, $user['user_id'], null, null, 'PASSWORD_RESET_REQ', 'USER', $user['user_id']);

echo json_encode([
  "success" => true, 
  "user_id" => $user['user_id'], 
  "message" => "Reset code sent to your email."
]);