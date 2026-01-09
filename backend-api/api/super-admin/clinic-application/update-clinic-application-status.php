<?php
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../middleware/auth-middleware.php';

$admin = validate_auth(['super_admin']);

try {
  $pdo = (new Database())->pdo;

  $data = json_decode(file_get_contents('php://input'));

  if(!$data || !isset($data->branch_id) || !isset($data->status)) {
    throw new Exception("Missing required data (branch_id or status)");
  }

  $stmt = $pdo->prepare(
    "UPDATE clinic_branches_tb 
    SET status = :status, feedback = :feedback
    WHERE branch_id = :id"
  );

  $stmt->execute([
    ':status' => $data->status,
    ':feedback' => $data->feedback ?? '',
    ':id' => $data->branch_id
  ]);

  if($data->status === 'approved') {
    $userStmt = $pdo->prepare(
      "UPDATE user_tb u
      JOIN clinics_tb c ON u.user_id = c.created_by
      JOIN clinic_branches_tb b ON c.clinic_id = b.clinic_id
      SET u.status = 'approved'
      WHERE b.branch_id = :id"
    );
    $userStmt->execute([':id' => $data->branch_id]);
  }

  echo json_encode([
    "success" => true, 
    "message" => "Branch status updated to " . $data->status
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
}