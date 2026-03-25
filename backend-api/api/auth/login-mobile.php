<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../service/Otp.php';
require_once __DIR__ . '/../../service/MailService.php';

try {
  $pdo = (new Database())->pdo;
  $dataInput = json_decode(file_get_contents("php://input"), true);

  $maintStmt = $pdo->query("SELECT is_maintenance FROM platform_settings_tb LIMIT 1");
  $platform = $maintStmt->fetch(PDO::FETCH_ASSOC);

  if ($platform && (int)$platform['is_maintenance'] === 1) {
    // Crucial: 503 tells the app to swap to the maintenance screen
    http_response_code(503); 
    echo json_encode([
      "success" => false, 
      "message" => "System maintenance is in progress."
    ]);
    exit;
  }

  $email = $dataInput["email"] ?? null;
  $password = $dataInput["password"] ?? null;

  if(!$email || !$password) {
    echo json_encode(["success" => false, "message" => "Email and password are required"]);
    exit;
  }

  $stmt = $pdo->prepare(
    "SELECT u.user_id, u.email, u.first_name, u.last_name, u.password, u.role_id, r.role_name
    FROM user_tb u
    JOIN roles_tb r ON u.role_id = r.role_id
    WHERE u.email = :email"
  );
  $stmt->execute([":email" => $email]);
  $user = $stmt->fetch();

  if(!$user) {
    echo json_encode(["success" => false, "message" => "Email address not found"]);
    exit;
  }

  if (!password_verify($password, $user["password"])) {
    echo json_encode(["success" => false, "message" => "Incorrect password"]);
    exit;
  }

  // Role check
  $restrictedRoles = ['super_admin', 'clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff'];
  if(in_array($user['role_name'], $restrictedRoles)) {
    echo json_encode(["success" => false, "message" => "Access not allowed on this platform"]);
    exit;
  }

  $otpData = generateOtp($user['user_id'], 'login', 5);
    
  sendMailOTP($user['email'], $otpData['otp'], $user['first_name'], 'login', $otpData['expires_at']);

  echo json_encode([
  "success" => true,
    "message" => "OTP sent to email. Please verify to complete login.",
    "user_id" => $user['user_id'],
    "requires_otp" => true 
  ]);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>