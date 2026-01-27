<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../../config/Database.php'; 

try {
  $pdo = (new Database())->pdo;
  $stmt = $pdo->prepare("SELECT service_id, name FROM service_tb ORDER BY name ASC");
  $stmt->execute();

  $services = $stmt->fetchAll();

  echo json_encode([
    "success" => true,
    "data" => $services
  ]);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
}
?>