<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../service/Otp.php'; 
require_once __DIR__ . '/../../helper/log_audit.php';

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents("php://input"), true);

  $otp = $data['otp'] ?? '';
  $tempId = $data['temp_user_id'] ?? '';
  $userData = $data['full_data'] ?? null;

  if (!$userData) throw new Exception("Data missing.");

  $isValid = verifyOtp($tempId, $otp, 'register'); 
  if(!$isValid) throw new Exception("Invalid or expired code.");

  $pdo->beginTransaction();

  // insert user
  $hashedPass = password_hash($userData['password'], PASSWORD_BCRYPT);
  $stmt = $pdo->prepare(
    "INSERT INTO user_tb (first_name, last_name, email, password, role_id, status) 
    VALUES (?, ?, ?, ?, 7, 'approved')"
  );
  $stmt->execute([
    $userData['first_name'], $userData['last_name'], $userData['email'], $hashedPass
  ]);
  
  $newUserId = $pdo->lastInsertId();

  // clean otp
  $stmtClean = $pdo->prepare("DELETE FROM otp_tb WHERE user_id = ? AND type = 'register'");
  $stmtClean->execute([$tempId]);

  // audit
  log_audit($pdo, $newUserId, null, null, 'CREATE', 'USER', $newUserId);

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Registration complete!"]);

} catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>