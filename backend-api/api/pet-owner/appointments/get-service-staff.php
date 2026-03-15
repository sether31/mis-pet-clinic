<?php
ob_clean();
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';

$decoded = validate_auth(['pet_owner']); 

try {
  $pdo = (new Database())->pdo;

  if(!isset($_GET['branch_id']) || !isset($_GET['branch_service_id'])) {
    throw new Exception("Branch ID and Branch Service ID are required.");
  }

  $branch_id = $_GET['branch_id'];
  $branch_service_id = $_GET['branch_service_id'];

  // Check if the clinic expired 
  $checkStmt = $pdo->prepare(
    "SELECT 
      cb.is_maintenance, 
      cb.status, 
      (SELECT COUNT(*) FROM branch_subscriptions_tb bs 
        WHERE bs.branch_id = cb.branch_id 
        AND LOWER(bs.status) = 'active' 
        AND bs.end_date >= CURDATE()
      ) as has_sub
    FROM clinic_branches_tb cb 
    WHERE cb.branch_id = ?"
  );
  $checkStmt->execute([$branch_id]);
  $clinicCheck = $checkStmt->fetch();

  if (!$clinicCheck || 
    $clinicCheck['is_maintenance'] == 1 || 
    strtolower($clinicCheck['status']) !== 'approved' || 
    $clinicCheck['has_sub'] == 0
  ) {
    echo json_encode(["success" => false, "is_unavailable" => true, "message" => "This clinic is currently under maintenance."]);
    exit; 
  }

  // Fetch the assigned role (CHANGED TO SINGULAR: assigned_role)
  $stmtService = $pdo->prepare("SELECT assigned_role FROM branch_service_tb WHERE branch_service_id = ? AND status = 1 LIMIT 1");
  $stmtService->execute([$branch_service_id]);
  $service = $stmtService->fetch();

  $allowedRoles = [];
  
  // Bulletproof JSON Parsing (CHANGED TO SINGULAR: assigned_role)
  if ($service && !empty($service['assigned_role'])) {
    $val = trim($service['assigned_role']);
    
    // Safely decode if it looks like a JSON array
    if (strpos($val, '[') === 0) {
      $decodedArr = json_decode($val, true);
      if (is_array($decodedArr)) {
        // Convert every role in the array to lowercase to avoid matching errors
        $allowedRoles = array_map('strtolower', $decodedArr);
      }
    } else {
      // If it's somehow just a plain string
      $allowedRoles = [strtolower($val)];
  }
  }

  $staffList = [];

  // Fetch the specific staff members
  if (!empty($allowedRoles)) {
    $placeholders = implode(',', array_fill(0, count($allowedRoles), '?'));
    
    $sql = "SELECT s.staff_id, 
        COALESCE(u.first_name, 'Unknown') as first_name, 
        COALESCE(u.last_name, 'Professional') as last_name, 
        r.role_name as role
      FROM branch_staff_tb s
      LEFT JOIN user_tb u ON s.user_id = u.user_id
      LEFT JOIN roles_tb r ON u.role_id = r.role_id
      WHERE s.branch_id = ? 
        AND s.status = 1 
        AND LOWER(r.role_name) IN ($placeholders)";
        
    $stmtStaff = $pdo->prepare($sql);
    
    // Merge branch_id with the array of lowercase roles
    $params = array_merge([$branch_id], $allowedRoles);
    $stmtStaff->execute($params);
    
    $staffList = $stmtStaff->fetchAll();
  } 

  // Fallback if no roles are set on the service
  if(empty($staffList)) {
    $stmtFallback = $pdo->prepare(
      "SELECT s.staff_id, 
        COALESCE(u.first_name, 'Unknown') as first_name, 
        COALESCE(u.last_name, 'Professional') as last_name
      FROM branch_staff_tb s
      LEFT JOIN user_tb u ON s.user_id = u.user_id
      WHERE s.branch_id = :branch_id 
        AND s.status = 1"
    );
    $stmtFallback->execute([':branch_id' => $branch_id]);
    $staffList = $stmtFallback->fetchAll();
  }

  // Format names for UI
  foreach($staffList as &$staff) {
    if(isset($staff['role'])) {
      if(strtolower($staff['role']) === 'branch_admin') {
        $staff['role'] = 'Branch Manager';
      } else {
        $staff['role'] = ucwords(str_replace('_', ' ', $staff['role']));
      }
    }
  }

  echo json_encode(["success" => true, "data" => $staffList]);

} catch(Throwable $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>