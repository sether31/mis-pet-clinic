<?php
ob_clean();
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../service/Jwt.php'; 

$decoded = validate_auth(['pet_owner']); 

try {
  $pdo = (new Database())->pdo;

  $stmtClinics = $pdo->prepare(
    "SELECT 
      cb.branch_id,
      cb.name as branch_name,
      cb.logo_picture as branch_image,
      cb.address,
      cb.municipality,
      cb.province,
      cb.contact_number,
      cb.created_at,
      
      -- Let MySQL glue the active services together into a comma-separated string
      GROUP_CONCAT(DISTINCT COALESCE(NULLIF(bsrv.custom_name, ''), srv.name) SEPARATOR ',') as offered_services
      
    FROM clinic_branches_tb cb
    JOIN branch_subscriptions_tb bs ON cb.branch_id = bs.branch_id
    LEFT JOIN branch_service_tb bsrv ON cb.branch_id = bsrv.branch_id AND bsrv.status = 1
    LEFT JOIN service_tb srv ON bsrv.service_id = srv.service_id 
    
    WHERE LOWER(cb.status) = 'approved' 
      AND (cb.is_maintenance = 0 OR cb.is_maintenance IS NULL)
      AND LOWER(bs.status) = 'active'
      AND bs.end_date >= CURDATE() 
      
    -- EVERY selected column must be here to prevent MySQL Strict Mode errors
    GROUP BY 
      cb.branch_id,
      cb.name,
      cb.logo_picture,
      cb.address,
      cb.municipality,
      cb.province,
      cb.contact_number,
      cb.created_at
      
    ORDER BY cb.created_at DESC"
  );
  
  $stmtClinics->execute();
  
  $clinics = [];

  while ($row = $stmtClinics->fetch()) {
    // Address Formatting
    $base_address = trim($row['address']);
    $muni = trim($row['municipality']);
    $prov = trim($row['province']);

    $full_address = $base_address;
    if(!empty($muni) && stripos($full_address, $muni) === false) $full_address .= ', ' . $muni;
    if(!empty($prov) && stripos($full_address, $prov) === false) $full_address .= ', ' . $prov;

    $row['full_address'] = $full_address;

    // Convert into a JSON array
    $row['services'] = !empty($row['offered_services']) ? explode(',', $row['offered_services']) : [];
    
    // Clean up the raw string so it doesn't get sent to the app
    unset($row['offered_services']); 

    $clinics[] = $row;
  }

  echo json_encode(["success" => true, "data" => $clinics]);

} catch(Throwable $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>