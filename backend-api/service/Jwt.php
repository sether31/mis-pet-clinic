<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();


function createJWT($payload, $expiresInSeconds = 3600) {
  $payload['exp'] = time() + $expiresInSeconds;

  return JWT::encode($payload, $_ENV['JWT_SEC_KEY'], 'HS256');
}

function verifyJWT($token) {
  try {
    return JWT::decode($token, new Key($_ENV['JWT_SEC_KEY'], 'HS256'));
  } catch(Exception $e) {
    return false;
  }
}

?>