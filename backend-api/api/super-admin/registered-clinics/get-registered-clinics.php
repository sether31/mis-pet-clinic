<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

$admin = validate_auth(['super_admin']);

try {
  $pdo = (new Database())->pdo;

  // Filtered to only show those already in the system (Approved or Suspended)
  $stmt = $pdo->prepare(
    "SELECT cb.*, 
      c.name as clinic_group_name,
      u.first_name, 
      u.last_name, 
      u.email as owner_email,
      u.profile_picture as owner_photo,
      (SELECT GROUP_CONCAT(s.name SEPARATOR ', ') 
        FROM branch_service_tb bs 
        JOIN service_tb s ON bs.service_id = s.service_id 
        WHERE bs.branch_id = cb.branch_id) as services_list
      FROM clinic_branches_tb cb
      JOIN clinics_tb c ON cb.clinic_id = c.clinic_id
      JOIN user_tb u ON c.created_by = u.user_id
      WHERE cb.status IN ('approved', 'suspended')
      ORDER BY cb.created_at DESC"
  );
  $stmt->execute();
  $data = $stmt->fetchAll();

  echo json_encode([
    "success" => true,
    "data" => $data
  ]);

} catch (Exception $e) {
  echo json_encode([
    "success" => false,
    "message" => "Failed to fetch registered clinics: " . $e->getMessage()
  ]);
}