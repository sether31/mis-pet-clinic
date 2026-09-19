<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../service/Jwt.php';
require_once __DIR__ . '/../../helper/log_audit.php';

try {
  $pdo = (new Database())->pdo;

  $data = json_decode(file_get_contents("php://input"), true);
  $code = $data['code'] ?? null;
  $platform = $data['platform'] ?? "web";

  if (!$code) {
    throw new Exception("Authorization code is required");
  }

  if (!$platform) {
    throw new Exception("Platform identifier is required");
  }

  // 1. Define allowed roles based on the platform passed from the frontend
  $allowedRoles = $platform === "web" ?
    ['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff'] :
    ['pet_owner'];

  // Initialize Google Client
  $client = new Google\Client();
  $client->setClientId($_ENV['GOOGLE_CLIENT_ID']);
  $client->setClientSecret($_ENV['GOOGLE_CLIENT_SECRET_ID']); // Fixed from GOOGLE_CLIENT_SECRET_ID
  $client->setRedirectUri('postmessage');

  // Exchange frontend auth code for access token
  $token = $client->fetchAccessTokenWithAuthCode($code);

  if (isset($token['error'])) {
    throw new Exception("Google authentication failed: " . ($token['error_description'] ?? $token['error']));
  }

  $client->setAccessToken($token);

  // Get the user's profile information using the lightweight OAuth2 service
  $oauth2 = new Google\Service\Oauth2($client);
  $googleUserInfo = $oauth2->userinfo->get();
  $email = $googleUserInfo->email;

  if (!$email) {
    throw new Exception("Could not retrieve email from Google.");
  }

  // query
  $stmtUser = $pdo->prepare(
    "SELECT 
      u.user_id, 
      u.email, 
      u.first_name, 
      u.last_name, 
      u.status, 
      r.role_name, 
      c.clinic_id 
    FROM user_tb u
    JOIN roles_tb r ON u.role_id = r.role_id
    LEFT JOIN clinics_tb c ON c.created_by = u.user_id
    WHERE u.email = :email"
  );
  $stmtUser->execute([":email" => $email]);
  $user = $stmtUser->fetch();

  if (!$user) {
    throw new Exception("No account is associated with this Google email. Please register first.");
  }

  // check user role
  if (!in_array($user['role_name'], $allowedRoles)) {
    throw new Exception("Access not allowed on this platform. Please use the appropriate app or portal.");
  }

  $userId = $user['user_id'];
  $permissions = [];
  $branchId = null;
  $clinicId = $user['clinic_id'] ?? 0;

  if ($user['role_name'] === 'clinic_admin') {
    // all access for admin
    $permissions = ['all_access'];
    $branchId = null;
  } else {
    // fetch staff branch and their permission
    $stmtStaff = $pdo->prepare(
      "SELECT branch_id, permissions 
      FROM branch_staff_tb 
      WHERE user_id = :user_id AND status = '1'
      LIMIT 1"
    );
    $stmtStaff->execute([":user_id" => $userId]);
    $staffBranch = $stmtStaff->fetch();

    if (!$staffBranch) {
      throw new Exception("Your account has been deactivated. Please contact your Administrator.");
    }

    $permissions = json_decode($staffBranch['permissions'] ?? '[]', true);
    $branchId = $staffBranch['branch_id'];
  }

  $payload = [
    "user_id" => $user['user_id'],
    "role" => $user['role_name'],
    "email" => $user['email'],
    "fname" => $user['first_name'],
    "lname" => $user['last_name'],
    "status" => $user['status'],
    "permissions" => $permissions,
    "branch_id" => $branchId
  ];

  $accessToken = createJWT($payload, 1000000000);

  // audit login user
  // log_audit($pdo, $userId, $clinicId ?: null, $branchId ?: null, 'GOOGLE_LOGIN', 'USER', $userId);

  echo json_encode([
    "success" => true,
    "message" => "Login successful",
    "access_token" => $accessToken,
    "redirect_hint" => $user['role_name'] === 'clinic_admin' ? 'select-branch' : 'portal'
  ]);
} catch (Throwable $e) {
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
  exit;
}
