<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST, GET");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../service/Jwt.php';  
require_once __DIR__ . '/../../service/Otp.php';
require_once __DIR__ . '/../../helper/log_audit.php';

try {
  $pdo = (new Database())->pdo;

  $data = json_decode(file_get_contents("php://input"), true);
  $userId = $data['user_id'] ?? null;
  $otpCode = $data['otp'] ?? null;

  if(!$userId || !$otpCode) {
    throw new Exception("User ID and OTP are required");
  }

  if(!verifyOtp($userId, $otpCode, 'login')) {
    throw new Exception("Invalid or expired OTP");
  }

  // get user 
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
    WHERE u.user_id = :user_id"
  );
  $stmtUser->execute([":user_id" => $userId]);
  $user = $stmtUser->fetch();

  if(!$user) {
    throw new Exception("User not found");
  }

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

    if(!$staffBranch) {
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
  log_audit($pdo, $user['user_id'], $clinicId ?: null, $branchId ?: null, 'LOGIN', 'USER', $user['user_id']);

  echo json_encode([
    "success" => true,
    "message" => "Login successful",
    "access_token" => $accessToken,
    "redirect_hint" => $user['role_name'] === 'clinic_admin' ? 'select-branch' : 'portal'
  ]);

} catch(Throwable $e) {
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
  exit;
}


?>