<?php
require_once __DIR__ . '/../../../../../config/Database.php';
require_once __DIR__ . '/../../../../../middleware/auth-middleware.php';

$admin = validate_auth(['clinic_admin', 'branch_admin']);
$data = json_decode(file_get_contents("php://input"), true);

$branch_id = $data['branch_id'] ?? null; 

if(!$branch_id) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Branch ID is required."]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  
  $stmt = $pdo->prepare(
    "SELECT 
      c.brand_logo,
      c.name as main_branding_name,
      b.logo_picture,
      b.name, b.address, b.municipality, b.province, b.zip_code, 
      b.est, b.contact_number, b.description, b.website, b.facebook, 
      b.tin_id_picture, b.business_permit_picture, 
      b.tin_id_number, b.business_permit_number, 
      b.status, b.is_configured, b.feedback
    FROM clinic_branches_tb b
    INNER JOIN clinics_tb c ON b.clinic_id = c.clinic_id
    WHERE b.branch_id = :branch_id
    LIMIT 1"
  );

  $stmt->execute([
    ':branch_id' => $branch_id
  ]);

  $data = $stmt->fetch();

  if(!$data) {
    echo json_encode(["success" => false, "message" => "Branch not found."]);
    exit;
  }

  echo json_encode(["success" => true, "data" => $data]);

} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>