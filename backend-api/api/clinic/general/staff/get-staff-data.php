<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

header('Content-Type: application/json');

$branch_id = $_GET['branch_id'] ?? null;

if(!$branch_id) {
  echo json_encode(["success" => false, "message" => "Branch ID is required"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare(
    "SELECT 
      u.user_id, 
      u.first_name as fname, 
      u.last_name as lname, 
      u.email, 
      u.role_id, 
      r.role_name,
      bs.staff_id,
      bs.branch_id,
      bs.permissions,
      bs.status
    FROM user_tb u
    JOIN roles_tb r ON u.role_id = r.role_id
    JOIN branch_staff_tb bs ON u.user_id = bs.user_id
    WHERE bs.branch_id = :branch_id"
  );
  $stmt->execute([':branch_id' => $branch_id]);
  $staff = $stmt->fetchAll();

  // initialize count data
  $cardData = [
    "total" => count($staff),
    "active" => 0,
    "vets" => 0,
    "groomers" => 0,
    "staff" => 0,
    "onDuty" => 0 
  ];

  foreach($staff as &$member) {
    // decode permissions
    $member['permissions'] = json_decode($member['permissions'] ?? '[]');
    
    // count active
    if ((int)$member['status'] === 1) $cardData['active']++;
    
    // count role
    $role = strtolower($member['role_name']);
    if ($role === 'veterinarian') $cardData['vets']++;
    elseif ($role === 'groomer') $cardData['groomers']++;
    elseif ($role === 'staff') $cardData['staff']++;
  }

  echo json_encode([
    "success" => true,
    "data" => $staff,
    "cardData" => $cardData 
  ]);

} catch(Exception $e) {
  echo json_encode([
    "success" => false,
    "message" => "Database error: " . $e->getMessage()
  ]);
}