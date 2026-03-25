<?php
require_once __DIR__ . '/../config/Database.php';

function generateOtp($userId, $purpose, $expiryMin = 5) {
  $pdo = (new Database())->pdo;
  cleanupOtp($userId, $purpose);
  $otpCode = rand(100000, 999999);
  $expiresAt = date('Y-m-d H:i:s', strtotime("+$expiryMin minutes"));

  $stmt = $pdo->prepare(
    "INSERT INTO otp_tb (user_id, otp_code, purpose, expires_at)
    VALUES (:user_id, :otp_code, :purpose, :expires_at)"
  );
  $stmt->execute([
    ':user_id' => $userId,
    ':otp_code' => $otpCode,
    ':purpose' => $purpose,
    ':expires_at' => $expiresAt
  ]);

  return ['otp' => $otpCode, 'expires_at' => $expiresAt];
}


function verifyOtp($userId, $otpCode, $purpose) {
  $pdo = (new Database())->pdo;
  $stmt = $pdo->prepare(
    "SELECT * FROM otp_tb
    WHERE user_id = :user_id AND otp_code = :otp_code AND purpose = :purpose
    ORDER BY otp_id DESC
    LIMIT 1"
  );
  $stmt->execute([
    ':user_id' => $userId,
    ':otp_code' => $otpCode,
    ':purpose' => $purpose
  ]);

  $otp = $stmt->fetch();
  if(!$otp || strtotime($otp['expires_at']) < time()) return false;

  $cleanup = $pdo->prepare("DELETE FROM otp_tb WHERE otp_id = ?");
  $cleanup->execute([$otp['otp_id']]);

  return true;
}


function cleanupOtp($userId, $purpose) {
  $pdo = (new Database())->pdo;
  $stmt = $pdo->prepare(
    "DELETE FROM otp_tb
    WHERE user_id = :user_id AND purpose = :purpose"
  );
  $stmt->execute([
    ':user_id' => $userId,
    ':purpose' => $purpose
  ]);
}
