<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

header('Content-Type: application/json');

$admin = validate_auth(['super_admin']);

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents("php://input"), true);

  $question  = trim($data['question'] ?? '');
  $answer    = trim($data['answer'] ?? '');
  // Cast to int to ensure we are working with numbers
  $sortOrder = isset($data['sort_order']) ? (int)$data['sort_order'] : null;

  // 1. Basic Validation
  if (empty($question) || empty($answer)) {
    throw new Exception("Question and Answer are required.");
  }

  if ($sortOrder === null || $sortOrder < 1) {
    throw new Exception("Please provide a valid sort order (1 or higher).");
  }

  // 2. Conflict Check: See if this number is already taken
  // We check ALL rows (active and archived) to prevent future unarchiving mess
  $checkStmt = $pdo->prepare("SELECT question FROM landing_accordion_tb WHERE sort_order = ? LIMIT 1");
  $checkStmt->execute([$sortOrder]);
  $existing = $checkStmt->fetch();

  if ($existing) {
    // If it exists, reject the request
    throw new Exception("Sort order #{$sortOrder} is already assigned to: '{$existing['question']}'");
  }

  // 3. Execution: If no conflict, proceed
  $stmt = $pdo->prepare("
    INSERT INTO landing_accordion_tb (question, answer, sort_order, is_active) 
    VALUES (?, ?, ?, 1)
  ");
  
  $stmt->execute([$question, $answer, $sortOrder]);

  echo json_encode([
    "success" => true, 
    "message" => "FAQ created successfully at position #{$sortOrder}."
]);

} catch (Exception $e) {
  // 409 Conflict is the proper HTTP status for this, but 400 works too
  http_response_code(400); 
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}