<?php
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';

$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$pdo = (new Database())->pdo;
$action = $_GET['action'] ?? '';
$branch_id = $_GET['branch_id'] ?? null; // Always require branch_id

if (!$branch_id) {
    echo json_encode(["success" => false, "message" => "Branch ID required"]);
    exit;
}
try {
  // STEP 1: Get pets owned by this user that have records AT THIS BRANCH
  if ($action === 'get_pets') {
      $owner_id = $_GET['owner_id'];
      $stmt = $pdo->prepare("
          SELECT DISTINCT p.pet_id, p.name, p.breed, p.pet_picture, p.medical_conditions
          FROM pet_tb p
          INNER JOIN appointments_tb a ON p.pet_id = a.pet_id
          INNER JOIN medrecord_tb m ON a.appointment_id = m.appointment_id
          WHERE p.owner_id = :owner_id 
          AND a.branch_id = :branch_id -- Added: Only show pets seen at this branch
      ");
      $stmt->execute([':owner_id' => $owner_id, ':branch_id' => $branch_id]);
      echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
      exit;
  }

  // STEP 2: Get unique services history for this pet at this branch
  if ($action === 'get_pet_services') {
      $pet_id = $_GET['pet_id'];
      $stmt = $pdo->prepare("
          SELECT DISTINCT bs.branch_service_id as service_id, bs.custom_name as service_name
          FROM medrecord_tb m
          INNER JOIN appointments_tb a ON m.appointment_id = a.appointment_id
          INNER JOIN branch_service_tb bs ON a.service_id = bs.branch_service_id
          WHERE a.pet_id = :pet_id 
          AND a.branch_id = :branch_id -- Filter services by branch
      ");
      $stmt->execute([':pet_id' => $pet_id, ':branch_id' => $branch_id]);
      echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
      exit;
  }

  // STEP 3: Get full history for a specific pet/service combo at this branch
  // STEP 3: Get full history for a specific pet/service combo at this branch
if ($action === 'get_service_history') {
    $pet_id = $_GET['pet_id'];
    $service_id = $_GET['service_id'];

    $stmt = $pdo->prepare("
      SELECT 
        m.*, 
        a.start_time, 
        m.status as med_status, 
        p.name as pet_name, 
        p.pet_picture,
        u.first_name as owner_name, 
        
        -- Get Branch Info
        b.name as branch_name,
        b.address as branch_address, -- This fix will show the address

        -- Get Staff Info (This fixes the '80' showing up)
        CONCAT(staff.first_name, ' ', staff.last_name) as updated_by_staff_name

      FROM medrecord_tb m
      INNER JOIN appointments_tb a ON m.appointment_id = a.appointment_id
      INNER JOIN pet_tb p ON a.pet_id = p.pet_id
      INNER JOIN user_tb u ON p.owner_id = u.user_id
      INNER JOIN clinic_branches_tb b ON a.branch_id = b.branch_id
      
      -- Join staff via the person who last updated it
      LEFT JOIN user_tb staff ON m.updated_by = staff.user_id 

      WHERE a.pet_id = :pet_id 
      AND a.service_id = :service_id
      AND a.branch_id = :branch_id 
      ORDER BY m.record_date DESC
    ");
    
    $stmt->execute([':pet_id' => $pet_id, ':service_id' => $service_id, ':branch_id' => $branch_id]);
    echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}