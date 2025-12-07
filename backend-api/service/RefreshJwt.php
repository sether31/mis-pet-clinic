<?php
require_once __DIR__ . '../service/Jwt.php';

$data = json_decode(file_get_contents("php://input"), true);
$refresh = $data["refresh_token"] ?? '';

$payload = verifyJWT($refresh);

if(!$payload) {
  echo json_encode(["success" => false, "message" => "Invalid refresh token"]);
  exit;
}

$newAccess = createJWT([
  "user_id" => $payload->user_id,
  "email" => $payload->email,
  "role" => $payload->role
], 3600);

echo json_encode([
  "success" => true,
  "access_token" => $newAccess
]);


?>
