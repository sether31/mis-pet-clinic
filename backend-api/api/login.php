<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST, GET");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../service/Jwt.php';
require_once __DIR__ . '/../service/Otp.php';
require_once __DIR__ . '/../service/MailService.php';

$pdo = (new Database())->pdo;

$dataInput = json_decode(file_get_contents("php://input"), true);

$email = $dataInput["email"] ?? null;
$password = $dataInput["password"] ?? null;
$platform = $dataInput["platform"] ?? null;

if(!$email || !$password || !$platform) {
  echo json_encode(["success" => false, "message" => "Email and password are required"]);
  exit;
}

// check roles
$allowedRoles = $platform === "web" ?
  ['super_admin', 'clinic_admin', 'staff', 'veterinarian'] :
  ['pet_owner'];

$stmt = $pdo->prepare(
  "SELECT u.user_id, u.email, u.name, u.password, u.role_id, r.role_name
  FROM user_tb u
  JOIN roles_tb r ON u.role_id = r.role_id
  WHERE u.email = :email"
);
$stmt->execute([
  ":email"=> $email
]);
$user = $stmt->fetch();

// check if theres user and if password is valid
if(!$user) {
  echo json_encode(["success" => false, "message" => "Invalid user"]);
  exit;
}

if(!password_verify($password, $user["password"])) {
  echo json_encode(["success" => false, "message" => "Invalid password"]);
  exit;
}

if(!in_array($user['role_name'], $allowedRoles)) {
  echo json_encode(["success" => false, "message" => "Access not allowed on this platform"]);
  exit;
}

// generate and send OTP
$otpData = generateOtp($user['user_id'], 'login', 5);
sendMailOTP(
  $user['email'],
  $otpData['otp'],
  $user['name'],
  'login',
  $otpData['expires_at']
);

echo json_encode([
  "success" => true,
  "message" => "OTP sent to email. Please verify to complete login.",
  "user_id" => $user['user_id']
]);


?>