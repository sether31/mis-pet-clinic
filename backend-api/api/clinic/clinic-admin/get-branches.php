<?php
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../middleware/auth-middleware.php';

$admin = validate_auth(['clinic_admin']); 

try {
  $pdo = (new Database())->pdo;

  // get all branches tha twas created by the admin
  $stmt = $pdo->prepare(
    "SELECT b.* FROM clinic_branches_tb b
    INNER JOIN clinics_tb c ON b.clinic_id = c.clinic_id
    WHERE c.created_by = :user_id
    ORDER BY b.status ASC, b.name ASC"
  );

  $stmt->execute([':user_id' => $admin->user_id]);
  $branches = $stmt->fetchAll();

  echo json_encode([
    "success" => true, 
    "data" => $branches
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>