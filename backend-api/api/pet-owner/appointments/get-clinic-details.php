<?php
ob_clean();
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';

$decoded = validate_auth(['pet_owner']); 

try {
  $pdo = (new Database())->pdo;

  if (!isset($_GET['branch_id'])) {
    throw new Exception("Branch ID is required.");
  }
  
  $branch_id = $_GET['branch_id'];

  $stmtClinic = $pdo->prepare(
    "SELECT 
      cb.branch_id,
      cb.name as branch_name,
      cb.logo_picture as branch_image,
      cb.address,
      cb.municipality,
      cb.province,
      cb.contact_number,
      cb.description,
      cb.website,     
      cb.facebook, 
      cb.est, 
      
      -- GATEKEEPER 
      cb.is_maintenance,
      cb.status as clinic_status,
      (SELECT IF(COUNT(*) > 0, 1, 0) 
      FROM branch_subscriptions_tb bs 
      WHERE bs.branch_id = cb.branch_id 
        AND LOWER(bs.status) = 'active' 
        AND bs.end_date >= CURDATE()
      ) as has_active_sub,

      -- Check if their ACTIVE subscription allows a shop
      (SELECT sub.has_shop 
      FROM branch_subscriptions_tb bs 
      JOIN subscription_tb sub ON bs.subscription_id = sub.subscription_id
      WHERE bs.branch_id = cb.branch_id 
        AND LOWER(bs.status) = 'active' 
        AND bs.end_date >= CURDATE()
      LIMIT 1
      ) as has_shop

    FROM clinic_branches_tb cb
    WHERE cb.branch_id = :branch_id
    LIMIT 1"
  );
  
  $stmtClinic->execute([':branch_id' => $branch_id]);
  $clinic = $stmtClinic->fetch(); 

  // Only throw an error if the clinic literally does not exist in the database
  if (!$clinic) {
    throw new Exception("Clinic not found.");
  }

  // Address Formatting
  $base_address = trim($clinic['address']);
  $muni = trim($clinic['municipality']);
  $prov = trim($clinic['province']);

  $full_address = $base_address;

  if(!empty($muni) && stripos($full_address, $muni) === false) {
    $full_address .= ', ' . $muni;
  }

  if(!empty($prov) && stripos($full_address, $prov) === false) {
    $full_address .= ', ' . $prov;
  }

  $clinic['full_address'] = $full_address;

  // Fetch Services specifically for this branch
  $stmtServices = $pdo->prepare(
    "SELECT 
      bsrv.branch_service_id,
      bsrv.service_id,
      COALESCE(NULLIF(bsrv.custom_name, ''), srv.name) as service_name,
      COALESCE(NULLIF(bsrv.custom_description, ''), srv.description) as description,
      bsrv.price,
      bsrv.duration 
    FROM branch_service_tb bsrv
    LEFT JOIN service_tb srv ON bsrv.service_id = srv.service_id
    WHERE bsrv.branch_id = :branch_id 
      AND bsrv.status = 1
    ORDER BY bsrv.created_at ASC"
  );
  $stmtServices->execute([':branch_id' => $branch_id]);
  $services = $stmtServices->fetchAll(); 

  echo json_encode([
    "success" => true,
    "data" => [
      "clinic" => $clinic,
      "services" => $services,
    ]
  ]);

} catch(Throwable $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>