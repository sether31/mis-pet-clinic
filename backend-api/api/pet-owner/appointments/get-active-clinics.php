<?php
ob_clean();
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../service/Jwt.php'; 

$decoded = validate_auth(['pet_owner']); 

try {
  $pdo = (new Database())->pdo;

  // We add the clinics_tb (c) to get the parent clinic name
  $stmtClinics = $pdo->prepare(
    "SELECT 
      c.clinic_id,
      c.brand_logo,
      c.name AS clinic_name,
      cb.branch_id,
      cb.name AS branch_name,
      cb.logo_picture AS branch_image,
      cb.address,
      cb.municipality,
      cb.province,
      cb.contact_number,
      cb.created_at,
      
      GROUP_CONCAT(DISTINCT COALESCE(NULLIF(bsrv.custom_name, ''), srv.name) SEPARATOR ',') as offered_services
      
    FROM clinics_tb c
    JOIN clinic_branches_tb cb ON c.clinic_id = cb.clinic_id
    JOIN branch_subscriptions_tb bs ON cb.branch_id = bs.branch_id
    LEFT JOIN branch_service_tb bsrv ON cb.branch_id = bsrv.branch_id AND bsrv.status = 1
    LEFT JOIN service_tb srv ON bsrv.service_id = srv.service_id 
    
    WHERE LOWER(cb.status) = 'approved' 
      AND (cb.is_maintenance = 0 OR cb.is_maintenance IS NULL)
      AND LOWER(bs.status) = 'active'
      AND bs.end_date >= CURDATE() 
      
    GROUP BY 
      c.clinic_id,
      c.name,
      cb.branch_id,
      cb.name,
      cb.logo_picture,
      cb.address,
      cb.municipality,
      cb.province,
      cb.contact_number,
      cb.created_at
      
    ORDER BY c.name ASC, cb.created_at DESC"
  );
  
  $stmtClinics->execute();
  
  $grouped_clinics = [];

  while ($row = $stmtClinics->fetch(PDO::FETCH_ASSOC)) {
    $clinic_id = $row['clinic_id'];

    // If the clinic parent isn't in our array yet, create it
    if (!isset($grouped_clinics[$clinic_id])) {
        $grouped_clinics[$clinic_id] = [
            'clinic_id' => $clinic_id,
            'brand_logo' => $row['brand_logo'],
            'clinic_name' => $row['clinic_name'],
            'branches' => []
        ];
    }

    // Format Branch Address
    $base_address = trim($row['address']);
    $muni = trim($row['municipality']);
    $prov = trim($row['province']);

    $full_address = $base_address;
    if(!empty($muni) && stripos($full_address, $muni) === false) $full_address .= ', ' . $muni;
    if(!empty($prov) && stripos($full_address, $prov) === false) $full_address .= ', ' . $prov;

    // Push the branch into the parent clinic's 'branches' array
    $grouped_clinics[$clinic_id]['branches'][] = [
        'branch_id' => $row['branch_id'],
        'brand_logo' => $row['brand_logo'],
        'branch_name' => $row['branch_name'],
        'branch_image' => $row['branch_image'],
        'full_address' => $full_address,
        'municipality' => $row['municipality'],
        'province' => $row['province'],
        'contact_number' => $row['contact_number'],
        'services' => !empty($row['offered_services']) ? explode(',', $row['offered_services']) : []
    ];
  }

  // Convert the associative array into a clean indexed array for JSON
  $final_output = array_values($grouped_clinics);

  echo json_encode(["success" => true, "data" => $final_output]);

} catch(Throwable $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>