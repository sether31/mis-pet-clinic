<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

$admin = validate_auth(['super_admin']);

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->branch_id) || !isset($data->status)) {
  echo json_encode(["success" => false, "message" => "Required data missing."]);
  exit();
}

try {
  $pdo = (new Database())->pdo;
  $stmt = $pdo->prepare(
    "UPDATE clinic_branches_tb 
    SET status = :status, 
      feedback = :feedback
    WHERE branch_id = :branch_id"
  );
  $stmt->execute([
    ':status' => $data->status,
    ':feedback' => $data->feedback ?? '', 
    ':branch_id' => $data->branch_id
  ]);

  echo json_encode([
    "success" => true,
    "message" => "Clinic records updated successfully."
  ]);

} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}