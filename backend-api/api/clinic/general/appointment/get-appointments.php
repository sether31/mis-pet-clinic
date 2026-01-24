<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

$decoded = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$branch_id = $_GET['branch_id'] ?? null;

try {
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare(
    "SELECT 
      a.appointment_id as id,
      a.start_time as start,
      a.end_time as end,
      a.status,
      p.name as pet_name,
      s.name as service_name,
      s.price as service_fee,         
      u_staff.first_name as staff_fname, 
      u_staff.last_name as staff_lname,
      u_owner.first_name as owner_fname, 
      u_owner.last_name as owner_lname   
    FROM appointments_tb a
    -- staff name
    JOIN branch_staff_tb bs ON a.staff_id = bs.staff_id
    JOIN user_tb u_staff ON bs.user_id = u_staff.user_id
    -- pet and owner name
    LEFT JOIN pet_tb p ON a.pet_id = p.pet_id
    LEFT JOIN user_tb u_owner ON p.owner_id = u_owner.user_id
    -- service details
    LEFT JOIN service_tb s ON a.service_id = s.service_id
    WHERE bs.branch_id = :branch_id
    AND a.start_time >= CURRENT_DATE"
  );
  
  $stmt->execute([':branch_id' => $branch_id]);
  $data = $stmt->fetchAll();

  echo json_encode(["success" => true, "data" => $data]);
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}