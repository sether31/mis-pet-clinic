<?php
ob_clean();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
require_once __DIR__ . '/../../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../../config/Database.php';

$user = validate_auth(['clinic_admin']); 

try {
    $pdo = (new Database())->pdo;
    $filter = $_GET['filter'] ?? 'today';

    // 1. Get Clinic ID
    $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinics_tb WHERE created_by = ? LIMIT 1");
    $stmtClinic->execute([$user->user_id]);
    $clinicId = $stmtClinic->fetchColumn();

    if (!$clinicId) throw new Exception("Clinic not found.");

    // 2. Virtual Date Logic (Crucial for correct billing attribution)
    // This ensures revenue follows the appointment time, not just the "swipe" time
    $virtualDate = "COALESCE(
        (SELECT MIN(a.start_time) FROM appointments_tb a WHERE a.order_id = p.order_id), 
        p.created_at
    )";

    // Helper for Date Constraints based on your reference script
    function getSqlDateConstraint($filter, $column) {
        switch ($filter) {
            case 'week':  return "YEARWEEK($column, 1) = YEARWEEK(CURDATE(), 1)";
            case 'month': return "MONTH($column) = MONTH(CURDATE()) AND YEAR($column) = YEAR(CURDATE())";
            case 'year':  return "YEAR($column) = YEAR(CURDATE())";
            case 'today':
            default:      return "DATE($column) = CURDATE()";
        }
    }

    $revDateClause = getSqlDateConstraint($filter, $virtualDate);
    $apptDateClause = getSqlDateConstraint($filter, "a.start_time");

    // 3. Valid Branch Subquery
    $validBranchIds = "SELECT b.branch_id FROM clinic_branches_tb b 
                      INNER JOIN branch_subscriptions_tb bs ON b.branch_id = bs.branch_id 
                      WHERE b.clinic_id = ? AND LOWER(b.status) = 'approved'";

    // 4. Global Stats
    $stmtStaff = $pdo->prepare("SELECT COUNT(*) FROM branch_staff_tb WHERE branch_id IN ($validBranchIds) AND status = 1");
    $stmtStaff->execute([$clinicId]);
    $totalStaff = (int)$stmtStaff->fetchColumn();

    $stmtGlobalAppts = $pdo->prepare("SELECT COUNT(*) FROM appointments_tb a WHERE a.branch_id IN ($validBranchIds) AND LOWER(a.status) = 'completed' AND $apptDateClause");
    $stmtGlobalAppts->execute([$clinicId]);
    $globalAppts = (int)$stmtGlobalAppts->fetchColumn();

    // Global Reservations
    $stmtGlobalRes = $pdo->prepare("SELECT COUNT(*) FROM appointments_tb a WHERE a.branch_id IN ($validBranchIds) AND LOWER(a.status) IN ('pending', 'confirmed') AND $apptDateClause");
    $stmtGlobalRes->execute([$clinicId]);
    $globalReservations = (int)$stmtGlobalRes->fetchColumn();

    // Realized Revenue (Using Virtual Date and Expanded Statuses)
    $stmtGlobalRev = $pdo->prepare("
        SELECT COALESCE(SUM(p.amount), 0) FROM payments_tb p
        WHERE p.branch_id IN ($validBranchIds) 
        AND LOWER(p.payment_status) IN ('paid', 'completed', 'success', 'fully paid', 'billed') 
        AND p.subscription_id IS NULL AND $revDateClause
    ");
    $stmtGlobalRev->execute([$clinicId]);
    $globalRev = (float)$stmtGlobalRev->fetchColumn();

    // Pending Revenue (Using Virtual Date)
    $stmtGlobalPending = $pdo->prepare("
        SELECT COALESCE(SUM(p.amount), 0) FROM payments_tb p
        WHERE p.branch_id IN ($validBranchIds) 
        AND LOWER(p.payment_status) IN ('pending', 'unpaid', 'partially paid') 
        AND p.subscription_id IS NULL AND $revDateClause
    ");
    $stmtGlobalPending->execute([$clinicId]);
    $globalPending = (float)$stmtGlobalPending->fetchColumn();

    // Total Product Units
    $stmtTotalProd = $pdo->prepare("
        SELECT COALESCE(SUM(oi.quantity), 0) 
        FROM order_items_tb oi
        JOIN payments_tb p ON oi.order_id = p.order_id
        WHERE p.branch_id IN ($validBranchIds)
        AND oi.product_id IS NOT NULL
        AND LOWER(p.payment_status) IN ('paid', 'completed', 'success', 'fully paid', 'billed')
        AND $revDateClause
    ");
    $stmtTotalProd->execute([$clinicId]);
    $totalProductUnits = (int)$stmtTotalProd->fetchColumn();

    // 5. Per-Branch Breakdown (Independent Counting)
    $stmtBranches = $pdo->prepare("
        SELECT b.branch_id, b.name, b.status, b.is_maintenance, b.logo_picture
        FROM clinic_branches_tb b
        INNER JOIN branch_subscriptions_tb bs ON b.branch_id = bs.branch_id
        WHERE b.clinic_id = ? AND LOWER(b.status) = 'approved'
        GROUP BY b.branch_id
    ");
    $stmtBranches->execute([$clinicId]);
    $branches = $stmtBranches->fetchAll(PDO::FETCH_ASSOC);

    $branchDataList = [];
    foreach ($branches as $branch) {
        $bid = $branch['branch_id'];

        $stmtBAppts = $pdo->prepare("SELECT COUNT(*) FROM appointments_tb a WHERE branch_id = ? AND LOWER(status) = 'completed' AND $apptDateClause");
        $stmtBAppts->execute([$bid]);
        
        $stmtBRes = $pdo->prepare("SELECT COUNT(*) FROM appointments_tb a WHERE branch_id = ? AND LOWER(status) IN ('pending', 'confirmed') AND $apptDateClause");
        $stmtBRes->execute([$bid]);

        $stmtBRev = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM payments_tb p WHERE branch_id = ? AND LOWER(payment_status) IN ('paid', 'completed', 'success', 'fully paid', 'billed') AND subscription_id IS NULL AND $revDateClause");
        $stmtBRev->execute([$bid]);

        $stmtBPending = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM payments_tb p WHERE branch_id = ? AND LOWER(payment_status) IN ('pending', 'unpaid', 'partially paid') AND subscription_id IS NULL AND $revDateClause");
        $stmtBPending->execute([$bid]);

        $stmtSub = $pdo->prepare("SELECT status FROM branch_subscriptions_tb WHERE branch_id = ? ORDER BY created_at DESC LIMIT 1");
        $stmtSub->execute([$bid]);
        $subStatus = $stmtSub->fetchColumn() ?: 'Expired';

        $branchDataList[] = [
            'branch_id' => $bid,
            'name' => ucwords(strtolower($branch['name'])),
            'logo_picture' => $branch['logo_picture'],
            'appts' => (int)$stmtBAppts->fetchColumn(),
            'reservations' => (int)$stmtBRes->fetchColumn(),
            'revenue' => (float)$stmtBRev->fetchColumn(),
            'pending_revenue' => (float)$stmtBPending->fetchColumn(),
            'status' => $branch['is_maintenance'] == 1 ? 'Maintenance' : $branch['status'],
            'sub_status' => ucwords(strtolower($subStatus))
        ];
    }

    // 6. TOP SERVICES & PRODUCTS
    $stmtTopServices = $pdo->prepare("
        SELECT bs.custom_name as name, COUNT(oi.service_id) as total_sold, SUM(oi.subtotal) as total_revenue
        FROM order_items_tb oi
        JOIN payments_tb p ON oi.order_id = p.order_id
        JOIN branch_service_tb bs ON oi.service_id = bs.branch_service_id
        WHERE p.branch_id IN (SELECT branch_id FROM clinic_branches_tb WHERE clinic_id = ?)
          AND LOWER(p.payment_status) IN ('paid', 'completed', 'success', 'fully paid', 'billed')
          AND oi.service_id IS NOT NULL AND $revDateClause 
        GROUP BY bs.custom_name ORDER BY total_revenue DESC LIMIT 5
    ");
    $stmtTopServices->execute([$clinicId]);
    $topServices = array_map(function($i) { $i['name'] = ucwords(strtolower($i['name'])); return $i; }, $stmtTopServices->fetchAll(PDO::FETCH_ASSOC));

    $stmtTopProducts = $pdo->prepare("
        SELECT prd.name as name, SUM(oi.quantity) as total_qty, SUM(oi.subtotal) as total_revenue
        FROM order_items_tb oi
        JOIN payments_tb p ON oi.order_id = p.order_id
        JOIN products_tb prd ON oi.product_id = prd.product_id
        WHERE p.branch_id IN (SELECT branch_id FROM clinic_branches_tb WHERE clinic_id = ?)
          AND LOWER(p.payment_status) IN ('paid', 'completed', 'success', 'fully paid', 'billed')
          AND oi.product_id IS NOT NULL AND $revDateClause
        GROUP BY prd.name ORDER BY total_revenue DESC LIMIT 5
    ");
    $stmtTopProducts->execute([$clinicId]);
    $topProducts = array_map(function($i) { $i['name'] = ucwords(strtolower($i['name'])); return $i; }, $stmtTopProducts->fetchAll(PDO::FETCH_ASSOC));

    echo json_encode([
        "success" => true,
        "data" => [
            "stats" => [
                "total_branches" => count($branches),
                "total_staff" => $totalStaff,
                "today_appointments" => $globalAppts,
                "today_reservations" => $globalReservations,
                "today_revenue" => $globalRev,
                "pending_revenue" => $globalPending,
                "total_product_sales" => $totalProductUnits
            ],
            "branches" => $branchDataList,
            "topServices" => $topServices,
            "topProducts" => $topProducts
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}