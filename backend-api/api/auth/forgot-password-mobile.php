<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../service/Otp.php';
require_once __DIR__ . '/../../service/MailService.php';
require_once __DIR__ . '/../../helper/log_audit.php';

try {
  $pdo = (new Database())->pdo;

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

  $dataInput = json_decode(file_get_contents("php://input"), true);
  $email = $dataInput["email"] ?? null;

  if (!$email) throw new Exception("Email is required");

  // Fetch user and role
  $stmt = $pdo->prepare(
    "SELECT u.user_id, u.email, u.first_name, r.role_name 
    FROM user_tb u 
    JOIN roles_tb r ON u.role_id = r.role_id 
    WHERE u.email = :email LIMIT 1"
  );
  $stmt->execute([":email" => $email]);
  $user = $stmt->fetch();

  if (!$user) throw new Exception("No account found with that email address");

  // check role
  $allowedRoles = ['pet_owner'];

  if (!in_array($user['role_name'], $allowedRoles)) {
    throw new Exception("Access not allowed on this platform. Please use the appropriate app or portal.");
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

  // audit
  log_audit($pdo, $user['user_id'], null, null, 'PASSWORD_RESET_REQ', 'USER', $user['user_id']);

  echo json_encode([
    "success" => true,
    "user_id" => $user['user_id'],
    "message" => "Reset code sent to your email."
  ]);
} catch (Throwable $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
