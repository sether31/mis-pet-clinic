<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

require_once __DIR__ . '/../../config/Database.php';

try {
  $database = new Database();
  $pdo = $database->pdo;

  $stmt = $pdo->prepare(
    "SELECT 
      accordion_id, 
      question, 
      answer, 
      sort_order, 
      is_active as status, 
      created_at, 
      updated_at 
    FROM landing_accordion_tb 
    ORDER BY sort_order ASC"
  );
  $stmt->execute();
  $faqs = $stmt->fetchAll();

  echo json_encode([
    "success" => true,
    "data" => $faqs
  ]);

} catch (PDOException $e) {
  error_log("Fetch FAQ Error: " . $e->getMessage());
  echo json_encode([
    "success" => false, 
    "message" => "Internal Server Error",
    "error_details" => $e->getMessage()
  ]);
} catch (Exception $e) {
  echo json_encode([
    "success" => false, 
    "message" => $e->getMessage()
  ]);
}