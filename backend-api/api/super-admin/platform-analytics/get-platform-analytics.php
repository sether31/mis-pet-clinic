<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';

$user = validate_auth(['super_admin']); 

try {
    $pdo = (new Database())->pdo;
    $filter = $_GET['filter'] ?? 'month';

    function getSqlDateConstraint($filter, $column) {
        switch ($filter) {
            case 'today':  return "DATE($column) = CURDATE()";
            case 'week':   return "YEARWEEK($column, 1) = YEARWEEK(CURDATE(), 1)";
            case 'month':  return "MONTH($column) = MONTH(CURDATE()) AND YEAR($column) = YEAR(CURDATE())";
            case 'year':   return "YEAR($column) = YEAR(CURDATE())";
            case 'all':    return "1=1"; 
            default:       return "MONTH($column) = MONTH(CURDATE()) AND YEAR($column) = YEAR(CURDATE())";
        }
    }

    $dateClauseP = getSqlDateConstraint($filter, "p.created_at");
    $dateClauseA = getSqlDateConstraint($filter, "a.created_at");
    $dateClauseO = getSqlDateConstraint($filter, "o.created_at");

    // ---------------------------------------------------------
    // 1. TOP-LEVEL STATS
    // ---------------------------------------------------------
    $totalClinics = (int)$pdo->query("SELECT COUNT(*) FROM clinics_tb")->fetchColumn();

    $activeSubs = (int)$pdo->query("
        SELECT COUNT(DISTINCT branch_id) FROM branch_subscriptions_tb 
        WHERE LOWER(status) = 'active' AND end_date >= CURDATE()
    ")->fetchColumn();

    $pendingApps = (int)$pdo->query("SELECT COUNT(*) FROM clinic_branches_tb WHERE LOWER(status) = 'pending'")->fetchColumn();

    $expiringSubs = (int)$pdo->query("
        SELECT COUNT(DISTINCT branch_id) FROM branch_subscriptions_tb 
        WHERE LOWER(status) = 'active' AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    ")->fetchColumn();

    $platformRevStmt = $pdo->prepare("
        SELECT COALESCE(SUM(amount), 0) FROM payments_tb p 
        WHERE subscription_id IS NOT NULL 
        AND LOWER(p.payment_status) = 'paid'
        AND $dateClauseP
    ");
    $platformRevStmt->execute();
    $platformRevenue = (float)$platformRevStmt->fetchColumn();

    // ---------------------------------------------------------
    // 2. LEADERBOARD DATA (Formatted with ucwords)
    // ---------------------------------------------------------

    // Top Subscriptions: Counts based on payment record and subscription name
    $stmtTopSubs = $pdo->prepare("
        SELECT 
            s.name, 
            COUNT(p.payment_id) as total_sold, 
            SUM(p.amount) as total_revenue
        FROM payments_tb p
        JOIN subscription_tb s ON p.subscription_id = s.subscription_id
        WHERE LOWER(p.payment_status) = 'paid' 
        AND p.payment_type = 'subscription' -- Specifically counting subscription payments
        AND $dateClauseP
        GROUP BY s.subscription_id
        ORDER BY total_revenue DESC 
        LIMIT 5
    ");
    $stmtTopSubs->execute();
    $topSubscriptions = array_map(function($item) {
        $item['name'] = ucwords(strtolower($item['name']));
        return $item;
    }, $stmtTopSubs->fetchAll(PDO::FETCH_ASSOC));

    // Top Regions: Formatted provinces
    $stmtTopRegions = $pdo->prepare("
        SELECT 
            b.province as name, 
            COUNT(DISTINCT b.branch_id) as branch_count, 
            SUM(p.amount) as total_revenue
        FROM payments_tb p
        JOIN clinic_branches_tb b ON p.branch_id = b.branch_id
        WHERE p.subscription_id IS NOT NULL 
        AND LOWER(p.payment_status) = 'paid' 
        AND $dateClauseP
        GROUP BY b.province
        ORDER BY total_revenue DESC 
        LIMIT 5
    ");
    $stmtTopRegions->execute();
    $topRegions = array_map(function($item) {
        $item['name'] = ucwords(strtolower($item['name']));
        return $item;
    }, $stmtTopRegions->fetchAll(PDO::FETCH_ASSOC));

    // ---------------------------------------------------------
    // 3. CLINIC PERFORMANCE TABLE
    // ---------------------------------------------------------
    $stmtBranches = $pdo->prepare("
        SELECT 
            b.branch_id, b.name as branch_name, b.logo_picture, b.status as branch_status, bs.status as subscription_status,
            (SELECT COUNT(*) FROM appointments_tb a WHERE a.branch_id = b.branch_id AND $dateClauseA) as period_appts,
            (SELECT COUNT(*) FROM order_tb o WHERE o.branch_id = b.branch_id AND o.pickup_date IS NOT NULL AND $dateClauseO) as period_reservations,
            (SELECT COALESCE(SUM(amount), 0) FROM payments_tb p 
             WHERE p.branch_id = b.branch_id AND p.subscription_id IS NULL AND LOWER(p.payment_status) = 'paid' AND $dateClauseP) as branch_revenue
        FROM clinic_branches_tb b
        INNER JOIN branch_subscriptions_tb bs ON b.branch_id = bs.branch_id
        WHERE LOWER(b.status) = 'approved' 
        GROUP BY b.branch_id
        ORDER BY branch_revenue DESC 
        LIMIT 100
    ");
    $stmtBranches->execute();
    $branches = $stmtBranches->fetchAll(PDO::FETCH_ASSOC);

    $formattedBranches = array_map(function($b) {
        return [
            'branch_id' => $b['branch_id'],
            'name' => ucwords(strtolower($b['branch_name'])),
            'logo_picture' => $b['logo_picture'],
            'appts' => (int)$b['period_appts'],
            'reservations' => (int)$b['period_reservations'],
            'revenue' => (float)$b['branch_revenue'],
            'sub_status' => ucwords(strtolower($b['subscription_status'] ?? 'None')),
            'status' => ucwords(strtolower($b['branch_status']))
        ];
    }, $branches);

    echo json_encode([
        "success" => true,
        "data" => [
            "stats" => [
                "total_clinics" => $totalClinics,
                "active_subscriptions" => $activeSubs,
                "pending_applications" => $pendingApps,
                "expiring_subscriptions" => $expiringSubs,
                "platform_revenue" => $platformRevenue
            ],
            "clinics" => $formattedBranches,
            "topSubscriptions" => $topSubscriptions,
            "topRegions" => $topRegions
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}