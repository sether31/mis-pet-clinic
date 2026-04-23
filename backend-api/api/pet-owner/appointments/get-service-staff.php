<?php
ob_clean();
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';

$decoded = validate_auth(['pet_owner']); 

try {
    $pdo = (new Database())->pdo;

    if(!isset($_GET['branch_id']) || !isset($_GET['branch_service_id']) || !isset($_GET['date'])) {
        throw new Exception("Branch ID, Service ID, and Date are required.");
    }

    $branch_id = $_GET['branch_id'];
    $branch_service_id = $_GET['branch_service_id'];
    $selected_date = $_GET['date'];
    $day_of_week = date('l', strtotime($selected_date)); // e.g., "Monday"

    // --- GATEKEEPER: MAINTENANCE & SUBSCRIPTION ---
    $checkStmt = $pdo->prepare(
        "SELECT cb.is_maintenance, cb.status, 
            (SELECT COUNT(*) FROM branch_subscriptions_tb bs 
             WHERE bs.branch_id = cb.branch_id AND LOWER(bs.status) = 'active' AND bs.end_date >= CURDATE()
            ) as has_sub
        FROM clinic_branches_tb cb WHERE cb.branch_id = ?"
    );
    $checkStmt->execute([$branch_id]);
    $clinicCheck = $checkStmt->fetch();

    if (!$clinicCheck || $clinicCheck['is_maintenance'] == 1 || strtolower($clinicCheck['status']) !== 'approved' || $clinicCheck['has_sub'] == 0) {
        echo json_encode(["success" => false, "is_unavailable" => true, "message" => "Clinic unavailable."]);
        exit; 
    }

    // --- STEP 1: IDENTIFY ALLOWED ROLES FROM SERVICES ---
    $allowedRoles = [];
    
    if ($branch_service_id === 'all') {
        // Fetch ALL assigned roles across ALL active services in this branch
        $stmtRoles = $pdo->prepare("SELECT assigned_role FROM branch_service_tb WHERE branch_id = ? AND status = 1");
        $stmtRoles->execute([$branch_id]);
        $rolesList = $stmtRoles->fetchAll(PDO::FETCH_COLUMN);
        
        foreach ($rolesList as $roleStr) {
            if (!empty($roleStr)) {
                $decodedArr = json_decode($roleStr, true);
                if (is_array($decodedArr)) {
                    foreach ($decodedArr as $r) $allowedRoles[] = strtolower(trim($r));
                } else {
                    $allowedRoles[] = strtolower(trim($roleStr));
                }
            }
        }
        $allowedRoles = array_unique($allowedRoles); // Remove duplicates
    } else {
        // Fetch roles for a specific service
        $stmtService = $pdo->prepare("SELECT assigned_role FROM branch_service_tb WHERE branch_service_id = ? AND status = 1 LIMIT 1");
        $stmtService->execute([$branch_service_id]);
        $service = $stmtService->fetch();

        if ($service && !empty($service['assigned_role'])) {
            $val = trim($service['assigned_role']);
            if (strpos($val, '[') === 0) {
                $decodedArr = json_decode($val, true);
                if (is_array($decodedArr)) $allowedRoles = array_map('strtolower', $decodedArr);
            } else {
                $allowedRoles = [strtolower($val)];
            }
        }
    }

    // If no roles are assigned to any service, return empty (no one is qualified)
    if (empty($allowedRoles)) {
        echo json_encode(["success" => true, "data" => []]);
        exit;
    }

    // --- STEP 2: FETCH QUALIFIED PROFESSIONALS & CHECK SCHEDULE ---
    $placeholders = implode(',', array_fill(0, count($allowedRoles), '?'));
    
    $sql = "SELECT s.staff_id, 
                   COALESCE(u.first_name, 'Unknown') as first_name, 
                   COALESCE(u.last_name, 'Professional') as last_name, 
                   r.role_name as role,
                   (SELECT COUNT(*) FROM branch_staff_schedule_tb sch 
                    WHERE sch.staff_id = s.staff_id 
                    AND sch.day_of_week = ? 
                    AND sch.is_available = 1) as on_duty
            FROM branch_staff_tb s
            LEFT JOIN user_tb u ON s.user_id = u.user_id
            LEFT JOIN roles_tb r ON u.role_id = r.role_id
            WHERE s.branch_id = ? 
            AND s.status = 1 
            AND LOWER(r.role_name) != 'staff' 
            AND LOWER(r.role_name) IN ($placeholders)";

    $params = array_merge([$day_of_week, $branch_id], $allowedRoles);

    $stmtStaff = $pdo->prepare($sql);
    $stmtStaff->execute($params);
    $staffList = $stmtStaff->fetchAll();

    // --- STEP 3: FORMATTING FOR UI ---
    foreach($staffList as &$staff) {
        if(isset($staff['role'])) {
            if(strtolower($staff['role']) === 'branch_admin') {
                $staff['role'] = 'Branch Manager';
            } else {
                $staff['role'] = ucwords(str_replace('_', ' ', $staff['role']));
            }
        }
        // Flag to tell frontend if they are available today
        $staff['is_available_today'] = ($staff['on_duty'] > 0);
    }

    echo json_encode(["success" => true, "data" => $staffList]);

} catch(Throwable $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>