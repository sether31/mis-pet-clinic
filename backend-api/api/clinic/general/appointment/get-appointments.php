<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

$decoded = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$branch_id = $_GET['branch_id'] ?? null;
$user_id = $decoded->user_id;
$role = $decoded->role;

try {
  $pdo = (new Database())->pdo;

  $sql = "SELECT 
    a.appointment_id as id,
    a.start_time as start,
    a.end_time as end,
    a.staff_id,   
    a.status,   
    p.pet_picture,       
    p.name as pet_name,
    s.custom_name as service_name,  
    s.price as service_fee,
    u_staff.first_name as staff_fname, 
    u_staff.last_name as staff_lname,
    REPLACE(r.role_name, '_', ' ') as role_name,
    CONCAT(u_staff.first_name, ' ', u_staff.last_name) as staff_name,
    u_owner.first_name as owner_fname, 
    u_owner.last_name as owner_lname,
    CONCAT(u_owner.first_name, ' ', u_owner.last_name) as owner_name,
    b.name as branch_name            
  FROM appointments_tb a
  JOIN clinic_branches_tb b ON a.branch_id = b.branch_id
  LEFT JOIN branch_staff_tb bs ON a.staff_id = bs.staff_id
  LEFT JOIN user_tb u_staff ON bs.user_id = u_staff.user_id
  LEFT JOIN roles_tb r ON u_staff.role_id = r.role_id
  LEFT JOIN pet_tb p ON a.pet_id = p.pet_id
  LEFT JOIN user_tb u_owner ON p.owner_id = u_owner.user_id
  LEFT JOIN branch_service_tb s ON a.service_id = s.branch_service_id
  WHERE a.branch_id = :branch_id
    AND a.status NOT IN ('cancelled')";

  $params = [':branch_id' => $branch_id];
  

  $adminRoles = ['clinic_admin', 'branch_admin'];

  if(!in_array($role, $adminRoles)) {
    // staff can only see their appointments
    $sql .= " AND bs.user_id = :user_id";
    $params[':user_id'] = $user_id;
  }

  $sql .= " ORDER BY a.start_time ASC";

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $data = $stmt->fetchAll();

  echo json_encode(["success" => true, "data" => $data]);
} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}