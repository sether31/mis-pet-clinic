<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$branch_id = $_GET['branch_id'] ?? null;

if(!$branch_id || $branch_id === 'undefined') {
  echo json_encode(["success" => false, "message" => "Branch ID missing"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $stmt = $pdo->prepare(
    "SELECT bs.*, s.name as master_name, s.description, bs.status
    FROM branch_service_tb bs
    JOIN service_tb s ON bs.service_id = s.service_id
    WHERE bs.branch_id = :branch_id"
  );
  $stmt->execute([':branch_id' => $branch_id]);
  $services = $stmt->fetchAll();

  $cardData = [
    "total" => count($services),
    "active" => 0,
    "vets" => 0,
    "groomers" => 0,
    "staff" => 0
  ];

  foreach($services as $s) {
    if((int)$s['status'] === 1) {
      $cardData['active']++;
    }

    // count based on assigned_role
    if($s['assigned_role'] === 'veterinarian') {
        $cardData['vets']++;
    } else if($s['assigned_role'] === 'groomer') {
        $cardData['groomers']++;
    } else if($s['assigned_role'] === 'support_staff' || $s['assigned_role'] === 'staff') {
      $cardData['staff']++;
    }
  }
  
  echo json_encode(["success" => true, "data" => $services, "cardData" => $cardData]);
} catch(Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}