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
  $userId = $data['user_id'] ?? null;
  $otpCode = $data['otp'] ?? null;

  if(!$userId || !$otpCode) {
    throw new Exception("User ID and OTP are required");
  }

  if(!verifyOtp($userId, $otpCode, 'password_reset')) {
    throw new Exception("Invalid or expired verification code");
  }

  // audit verify otp
  log_audit($pdo, $userId, null, null, 'PASSWORD_RESET_OTP_VERIFIED', 'USER', $userId);

  echo json_encode([
    "success" => true,
    "message" => "OTP verified successfully. You may now reset your password."
  ]);

} catch (Throwable $e) {
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
  exit;
}