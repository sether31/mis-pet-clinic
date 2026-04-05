<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

header('Content-Type: application/json');

$admin = validate_auth(['super_admin']);

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents("php://input"), true);

  $id = $data['accordion_id'] ?? null;
  $question  = trim($data['question'] ?? '');
  $answer    = trim($data['answer'] ?? '');
  $sortOrder = isset($data['sort_order']) ? (int)$data['sort_order'] : 0;
  $status    = isset($data['status']) ? (int)$data['status'] : 1;

  if (!$id) throw new Exception("ID is required for update.");
  if (empty($question) || empty($answer)) throw new Exception("Fields cannot be empty.");

  // 1. Check for Conflict
  // "Find a row that has this sort_order, BUT is NOT this current item"
  $checkStmt = $pdo->prepare("
      SELECT question 
      FROM landing_accordion_tb 
      WHERE sort_order = ? AND accordion_id != ? 
      LIMIT 1
  ");
  $checkStmt->execute([$sortOrder, $id]);
  $conflict = $checkStmt->fetch();

  if ($conflict) {
      throw new Exception("Position #{$sortOrder} is already taken by: '{$conflict['question']}'");
  }

  // 2. Proceed with Update
  $stmt = $pdo->prepare("
    UPDATE landing_accordion_tb 
    SET question = ?, answer = ?, sort_order = ?, is_active = ? 
    WHERE accordion_id = ?
  ");
  
  $success = $stmt->execute([$question, $answer, $sortOrder, $status, $id]);

  if (!$success) throw new Exception("Failed to update database.");

  echo json_encode(["success" => true, "message" => "FAQ updated successfully."]);

} catch (Exception $e) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}