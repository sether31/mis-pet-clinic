<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

$branch_id = $_GET['branch_id'] ?? null;
$period = $_GET['period'] ?? 'week';

if (!$branch_id) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Branch ID is required."]);
    exit;
}

try {
    $pdo = (new Database())->pdo;

    $virtualDate = "COALESCE(
        (SELECT MIN(a.start_time) FROM appointments_tb a WHERE a.order_id = p.order_id), 
        p.created_at
    )";

    // Helper for Date Constraints
    function getSqlDateConstraint($period, $column) {
        switch ($period) {
            case 'today': return "AND DATE($column) = CURDATE()";
            case 'month': return "AND MONTH($column) = MONTH(CURDATE()) AND YEAR($column) = YEAR(CURDATE())";
            case 'year':  return "AND YEAR($column) = YEAR(CURDATE())"; 
            case 'all':
                return " AND 1=1 ";
            case 'week':
            default:      return "AND YEARWEEK($column, 1) = YEARWEEK(CURDATE(), 1)"; 
        }
    }

    // --- 1. KPI CARD DATA ---

    $revDateClause = getSqlDateConstraint($period, $virtualDate);
    
    // Realized Revenue (Paid/Successful)
    $revStmt = $pdo->prepare("
        SELECT COALESCE(SUM(p.amount), 0) 
        FROM payments_tb p
        WHERE p.branch_id = :bid 
        AND LOWER(p.payment_status) IN ('paid', 'completed', 'success', 'fully paid', 'billed')
        AND p.subscription_id IS NULL
        $revDateClause 
    ");
    $revStmt->execute([':bid' => $branch_id]);
    $revenue = (float)$revStmt->fetchColumn();

    // Pending Revenue (Added)
    $pendingStmt = $pdo->prepare("
        SELECT COALESCE(SUM(p.amount), 0) 
        FROM payments_tb p
        WHERE p.branch_id = :bid 
        AND LOWER(p.payment_status) IN ('pending', 'unpaid', 'partially paid')
        AND p.subscription_id IS NULL
        $revDateClause 
    ");
    $pendingStmt->execute([':bid' => $branch_id]);
    $pendingRevenue = (float)$pendingStmt->fetchColumn();

    // Appointments Count (Strictly Completed)
    $apptDateClause = getSqlDateConstraint($period, 'a.start_time');
    $apptStmt = $pdo->prepare("
        SELECT COUNT(*) FROM appointments_tb a
        WHERE a.branch_id = :bid AND LOWER(a.status) = 'completed' $apptDateClause
    ");
    $apptStmt->execute([':bid' => $branch_id]);
    $appointments = (int)$apptStmt->fetchColumn();

    // Products Sold
    $orderDateClause = getSqlDateConstraint($period, 'o.updated_at');
    $prodCountStmt = $pdo->prepare("
        SELECT COALESCE(SUM(oi.quantity), 0) 
        FROM order_items_tb oi 
        JOIN order_tb o ON oi.order_id = o.order_id 
        WHERE o.branch_id = :bid AND oi.product_id IS NOT NULL 
        AND LOWER(o.order_status) IN ('completed', 'paid') $orderDateClause
    ");
    $prodCountStmt->execute([':bid' => $branch_id]);
    $productsSold = (int)$prodCountStmt->fetchColumn();

    // Completed Reservations (Product Pickups)
    $resDateClause = getSqlDateConstraint($period, 'o.updated_at');
    $resStmt = $pdo->prepare("
        SELECT COUNT(*) FROM order_tb o
        WHERE o.branch_id = :bid 
        AND o.pickup_date IS NOT NULL 
        AND LOWER(o.order_status) = 'completed' 
        $resDateClause
    ");
    $resStmt->execute([':bid' => $branch_id]);
    $completedReservations = (int)$resStmt->fetchColumn();

    // --- 2. REVENUE TREND ---
    $revenueTrend = [];
    if ($period === 'year') {
        $months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for ($m = 1; $m <= 12; $m++) {
            $tStmt = $pdo->prepare("
                SELECT COALESCE(SUM(p.amount), 0) FROM payments_tb p 
                WHERE p.branch_id = :bid AND LOWER(p.payment_status) IN ('paid', 'completed', 'success', 'fully paid', 'billed') 
                AND p.subscription_id IS NULL
                AND MONTH($virtualDate) = :m AND YEAR($virtualDate) = YEAR(CURDATE())
            ");
            $tStmt->execute([':bid' => $branch_id, ':m' => $m]);
            $revenueTrend[] = ["name" => $months[$m-1], "revenue" => (float)$tStmt->fetchColumn()];
        }
    } elseif ($period === 'today') {
        $slots = [['8AM','00:00','08:59'], ['12PM','09:00','12:59'], ['4PM','13:00','16:59'], ['8PM','17:00','23:59']];
        foreach ($slots as $s) {
            $tStmt = $pdo->prepare("
                SELECT COALESCE(SUM(p.amount), 0) FROM payments_tb p 
                WHERE p.branch_id = :bid AND LOWER(p.payment_status) IN ('paid', 'completed', 'success', 'fully paid', 'billed') 
                AND p.subscription_id IS NULL
                AND DATE($virtualDate) = CURDATE() AND TIME($virtualDate) BETWEEN :st AND :en
            ");
            $tStmt->execute([':bid' => $branch_id, ':st' => $s[1], ':en' => $s[2]]);
            $revenueTrend[] = ["name" => $s[0], "revenue" => (float)$tStmt->fetchColumn()];
        }
    } else {
        $startTs = ($period === 'week') ? strtotime('monday this week') : strtotime(date('Y-m-01'));
        $iterations = ($period === 'week') ? 6 : (int)date('t') - 1; 
        for ($i = 0; $i <= $iterations; $i++) {
            $curr = strtotime("+$i days", $startTs);
            $tStmt = $pdo->prepare("
                SELECT COALESCE(SUM(p.amount), 0) FROM payments_tb p 
                WHERE p.branch_id = :bid AND LOWER(p.payment_status) IN ('paid', 'completed', 'success', 'fully paid', 'billed') 
                AND p.subscription_id IS NULL
                AND DATE($virtualDate) = :d
            ");
            $tStmt->execute([':bid' => $branch_id, ':d' => date('Y-m-d', $curr)]);
            $revenueTrend[] = ["name" => date(($period === 'week' ? 'D' : 'M d'), $curr), "revenue" => (float)$tStmt->fetchColumn()];
        }
    }

    // --- 3. TOP SERVICES & PRODUCTS ---
    $orderVirtualDate = "COALESCE((SELECT MIN(a.start_time) FROM appointments_tb a WHERE a.order_id = o.order_id), o.created_at)";
    
    $svcStmt = $pdo->prepare("
        SELECT bs.custom_name as name, COUNT(oi.order_item_id) as count 
        FROM order_items_tb oi 
        JOIN branch_service_tb bs ON oi.service_id = bs.branch_service_id 
        JOIN order_tb o ON oi.order_id = o.order_id 
        WHERE o.branch_id = :bid AND oi.service_id IS NOT NULL 
        " . getSqlDateConstraint($period, $orderVirtualDate) . " 
        GROUP BY bs.branch_service_id ORDER BY count DESC LIMIT 5
    ");
    $svcStmt->execute([':bid' => $branch_id]);
    $topServices = array_map(function($item) {
        $item['name'] = ucwords(strtolower($item['name']));
        return $item;
    }, $svcStmt->fetchAll(PDO::FETCH_ASSOC));

    $pStmt = $pdo->prepare("
        SELECT 
            pr.name, 
            pr.brand_name, 
            pr.category, 
            pr.dosage,
            SUM(oi.quantity) as sales 
        FROM order_items_tb oi 
        JOIN products_tb pr ON oi.product_id = pr.product_id 
        JOIN order_tb o ON oi.order_id = o.order_id 
        WHERE o.branch_id = :bid 
        AND LOWER(o.order_status) IN ('completed', 'paid') 
        $orderDateClause 
        GROUP BY pr.product_id 
        ORDER BY sales DESC 
        LIMIT 5
    ");
    $pStmt->execute([':bid' => $branch_id]);

    $topProducts = array_map(function($item) {
        // Clean up the strings for a professional look
        $item['name'] = ucwords(strtolower($item['name']));
        $item['brand_name'] = $item['brand_name'] ? ucwords(strtolower($item['brand_name'])) : 'No Brand';
        $item['category'] = $item['category'] ? ucwords(strtolower($item['category'])) : 'General';
        $item['dosage'] = $item['dosage'] ? ucwords(strtolower($item['dosage'])) : 'N/A';
        return $item;
    }, $pStmt->fetchAll(PDO::FETCH_ASSOC));


    // --- 5. REVENUE BREAKDOWN ---
    $breakdownStmt = $pdo->prepare("
        SELECT 
            CASE 
                WHEN oi.product_id IS NOT NULL THEN 'Products' 
                WHEN oi.service_id IS NOT NULL THEN 'Services'
                ELSE 'Other' 
            END as category, 
            SUM(oi.subtotal) as value 
        FROM order_items_tb oi
        WHERE oi.order_id IN (
            SELECT p.order_id 
            FROM payments_tb p 
            WHERE p.branch_id = :bid 
            AND LOWER(p.payment_status) IN ('paid', 'completed', 'success', 'fully paid', 'billed')
            AND p.subscription_id IS NULL
            $revDateClause
        )
        GROUP BY category
    ");
    $breakdownStmt->execute([':bid' => $branch_id]);
    $revenueBreakdown = $breakdownStmt->fetchAll(PDO::FETCH_ASSOC);

    // --- 6. INVENTORY STATUS (Stock Levels) ---
    // Logic: Only count stock issues if the item is NOT expired and is active
    $invStatusStmt = $pdo->prepare("
        SELECT 
            SUM(CASE WHEN stock_level <= 0 THEN 1 ELSE 0 END) as out_of_stock,
            SUM(CASE WHEN stock_level > 0 AND stock_level <= min_stock_level THEN 1 ELSE 0 END) as low_stock
        FROM inventory_tb 
        WHERE branch_id = :bid 
        AND is_active = 1 
        AND (expiry_date >= CURDATE() OR expiry_date IS NULL) -- ONLY NOT EXPIRED
    ");
    $invStatusStmt->execute([':bid' => $branch_id]);
    $invCounts = $invStatusStmt->fetch(PDO::FETCH_ASSOC);

    $inventoryStatus = [
        ["category" => "Out of Stock", "count" => (int)($invCounts['out_of_stock'] ?? 0)],
        ["category" => "Low Stock", "count" => (int)($invCounts['low_stock'] ?? 0)]
    ];

    // --- 7. EXPIRY STATUS ---
    // Logic: Expired (before today), Expiring Soon (next 30 days)
    $expiryStmt = $pdo->prepare("
        SELECT 
            SUM(CASE WHEN expiry_date < CURDATE() THEN 1 ELSE 0 END) as expired,
            SUM(CASE WHEN expiry_date >= CURDATE() AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as expiring_soon
        FROM inventory_tb 
        WHERE branch_id = :bid 
        AND is_active = 1 
        AND expiry_date IS NOT NULL
    ");
    $expiryStmt->execute([':bid' => $branch_id]);
    $expCounts = $expiryStmt->fetch(PDO::FETCH_ASSOC);

    $expiryStatus = [
        ["name" => "Expired", "value" => (int)($expCounts['expired'] ?? 0)],
        ["name" => "Expiring Soon", "value" => (int)($expCounts['expiring_soon'] ?? 0)]
    ];

    echo json_encode([
        "success" => true,
        "data" => [
            "cardData" => [
                "revenue" => $revenue, 
                "pendingRevenue" => $pendingRevenue, 
                "productsSold" => $productsSold, 
                "appointments" => $appointments,
                "completedReservations" => $completedReservations
            ],
            "revenueTrend" => $revenueTrend,
            "topServices" => $topServices,
            "topProducts" => $topProducts,
            "revenueBreakdown" => $revenueBreakdown,
            "inventoryStatus" => $inventoryStatus, // Added
            "expiryStatus" => $expiryStatus
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}