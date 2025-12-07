<?php
require_once __DIR__ . '/jwt.php';

function requireAuth() {
  $headers = apache_request_headers();
  if (!isset($headers['Authorization'])) {
    echo json_encode(["success" => false, "message" => "No token"]);
    exit;
  }

  $token = str_replace("Bearer ", "", $headers["Authorization"]);
  $decoded = verifyJWT($token);

  if (!$decoded) {
    echo json_encode(["success" => false, "message" => "Invalid or expired token"]);
    exit;
  }
  return $decoded;
}


?>