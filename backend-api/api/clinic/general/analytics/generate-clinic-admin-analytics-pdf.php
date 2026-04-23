<?php
require_once __DIR__ . '/../../../../vendor/autoload.php'; 
require_once __DIR__ . '/../../../../config/Database.php';

use Dompdf\Dompdf;
use Dompdf\Options;

$user_id = $_GET['user_id'] ?? null; 
$period = $_GET['period'] ?? 'today';

if (!$user_id) {
    die("Unauthorized: User ID is required.");
}

function getSqlDateConstraint($period, $column) {
    switch ($period) {
        case 'week': return " AND YEARWEEK($column, 1) = YEARWEEK(CURDATE(), 1)";
        case 'month': return " AND MONTH($column) = MONTH(CURDATE()) AND YEAR($column) = YEAR(CURDATE())";
        case 'year': return " AND YEAR($column) = YEAR(CURDATE())";
        case 'all': return ""; 
        case 'today':
        default: return " AND DATE($column) = CURDATE()";
    }
}

try {
    $database = new Database();
    $pdo = $database->pdo;

    // 1. CLINIC & PLATFORM DETAILS
    $clinicStmt = $pdo->prepare("SELECT clinic_id, name as clinic_name FROM clinics_tb WHERE created_by = ? LIMIT 1");
    $clinicStmt->execute([$user_id]);
    $clinic = $clinicStmt->fetch();
    if (!$clinic) throw new Exception("Clinic not found.");
    
    $clinic_id = $clinic['clinic_id'];
    $clinic_display_name = ucwords(strtolower($clinic['clinic_name']));

    $platformStmt = $pdo->query("SELECT platform_name, platform_logo FROM platform_settings_tb LIMIT 1");
    $platform = $platformStmt->fetch();
    $platformName = ucwords(strtolower($platform['platform_name'] ?? 'Clinic Platform'));

    // 2. FILTERS
    $virtualDate = "CASE 
        WHEN p.payment_type = 'appointment' THEN (SELECT MIN(a.start_time) FROM appointments_tb a WHERE a.order_id = p.order_id)
        WHEN p.payment_type = 'product' THEN (SELECT o.pickup_date FROM order_tb o WHERE o.order_id = p.order_id)
        ELSE p.created_at 
    END";
    
    $revDateClause = getSqlDateConstraint($period, $virtualDate);
    $branchSub = "SELECT branch_id FROM clinic_branches_tb WHERE clinic_id = :cid AND LOWER(status) = 'approved'";

    /**
     * BROAD CONDITION 
     * Includes all items (Billed, Pending, Paid) as long as the appointment itself 
     * is no longer in 'pending' or 'confirmed' status.
     */
    $broadCondition = "p.branch_id IN ($branchSub) 
        AND (p.payment_type != 'appointment' 
             OR EXISTS (SELECT 1 FROM appointments_tb a WHERE a.order_id = p.order_id AND LOWER(a.status) NOT IN ('pending', 'confirmed'))) 
        $revDateClause";

    /**
     * STRICT CONDITION 
     * Specifically for "Money in the Bank".
     */
    $strictCondition = $broadCondition . " AND LOWER(p.payment_status) IN ('paid', 'completed', 'success', 'fully paid', 'billed')";

    // --- KPI CALCULATIONS ---

    // Total Revenue (STRICT)
    $revStmt = $pdo->prepare("SELECT COALESCE(SUM(p.amount), 0) FROM payments_tb p WHERE $strictCondition AND p.subscription_id IS NULL");
    $revStmt->execute([':cid' => $clinic_id]);
    $totalRevenue = (float)$revStmt->fetchColumn();

    // Pending Revenue
    $pendStmt = $pdo->prepare("SELECT COALESCE(SUM(p.amount), 0) FROM payments_tb p WHERE $broadCondition AND LOWER(p.payment_status) IN ('pending', 'unpaid', 'partially paid') AND p.subscription_id IS NULL");
    $pendStmt->execute([':cid' => $clinic_id]);
    $pendingRevenue = (float)$pendStmt->fetchColumn();

    // Completed Reservations (Strict)
    $resStmt = $pdo->prepare("SELECT COUNT(DISTINCT p.order_id) FROM payments_tb p WHERE $strictCondition AND p.payment_type = 'product'");
    $resStmt->execute([':cid' => $clinic_id]);
    $totalReservations = (int)$resStmt->fetchColumn();

    // Product Sales Volume (CHANGED TO BROAD: To show products tied to pending/billed appointments)
    $prodKpiStmt = $pdo->prepare("SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items_tb oi JOIN payments_tb p ON oi.order_id = p.order_id WHERE $broadCondition AND oi.product_id IS NOT NULL");
    $prodKpiStmt->execute([':cid' => $clinic_id]);
    $totalProductUnits = (int)$prodKpiStmt->fetchColumn();

    // Other KPI Counts
    $staffStmt = $pdo->prepare("SELECT COUNT(*) FROM branch_staff_tb WHERE branch_id IN ($branchSub) AND status = 1");
    $staffStmt->execute([':cid' => $clinic_id]);
    $totalStaff = $staffStmt->fetchColumn();

    $branchCountStmt = $pdo->prepare("SELECT COUNT(*) FROM clinic_branches_tb WHERE clinic_id = :cid AND LOWER(status) = 'approved'");
    $branchCountStmt->execute([':cid' => $clinic_id]);
    $totalBranches = $branchCountStmt->fetchColumn();

    // --- DATA TABLES ---

    // 1. SERVICES TABLE (Broad)
    $svcStmt = $pdo->prepare("SELECT COALESCE(bs.custom_name, 'Unknown Service') as name, COUNT(oi.service_id) as count, SUM(oi.subtotal) as revenue FROM order_items_tb oi JOIN payments_tb p ON oi.order_id = p.order_id LEFT JOIN branch_service_tb bs ON oi.service_id = bs.branch_service_id WHERE $broadCondition AND oi.service_id IS NOT NULL GROUP BY bs.custom_name ORDER BY revenue DESC");
    $svcStmt->execute([':cid' => $clinic_id]);
    $allServices = $svcStmt->fetchAll();

    $itemsHtml = ""; $grandTotalSvcRev = 0; $grandTotalSvcVol = 0;
    foreach ($allServices as $s) {
        $grandTotalSvcRev += $s['revenue'];
        $grandTotalSvcVol += $s['count'];
        $itemsHtml .= "<tr>
            <td style='padding: 8px; border: 1px solid #ddd;'>" . ucwords(strtolower(htmlspecialchars($s['name']))) . "</td>
            <td style='padding: 8px; border: 1px solid #ddd; text-align:center;'>{$s['count']}</td>
            <td style='padding: 8px; border: 1px solid #ddd; text-align:right;'>PHP " . number_format($s['revenue'], 2) . "</td>
        </tr>";
    }

    // 2. PRODUCTS TABLE (CHANGED TO BROAD: To include pending products tied to appointments)
    // 2. PRODUCTS TABLE (Updated with brand, type, and dosage)
    // 2. PRODUCTS TABLE (Updated with category, brand, type, and dosage)
    // 2. PRODUCTS TABLE (Sorted Highest to Lowest by Units Sold)
    $prdStmt = $pdo->prepare("SELECT 
            pr.name, 
            pr.brand_name, 
            pr.brand_type, 
            pr.dosage, 
            pr.category,
            SUM(oi.quantity) as qty, 
            SUM(oi.subtotal) as revenue 
        FROM order_items_tb oi 
        JOIN payments_tb p ON oi.order_id = p.order_id 
        JOIN products_tb pr ON oi.product_id = pr.product_id 
        WHERE $broadCondition AND oi.product_id IS NOT NULL 
        GROUP BY pr.name, pr.brand_name, pr.brand_type, pr.dosage, pr.category 
        ORDER BY qty DESC"); // <--- Changed from revenue to qty
    $prdStmt->execute([':cid' => $clinic_id]);
    $allProducts = $prdStmt->fetchAll();

    $prodRowsHtml = ""; 
    $grandTotalProdRev = 0; 
    $grandTotalProdQty = 0;

    foreach ($allProducts as $pr) {
        $grandTotalProdRev += $pr['revenue'];
        $grandTotalProdQty += $pr['qty'];

        // 1. Basic Brand Info
        $brandName = !empty($pr['brand_name']) ? ucwords(strtolower($pr['brand_name'])) : 'Generic';
        
        // 2. Conditional Metadata (Only for Medication category)
        $extraInfo = "";
        // Using strcasecmp for a safer case-insensitive comparison
        if (isset($pr['category']) && strcasecmp($pr['category'], 'medication') === 0) {
            $type = (!empty($pr['brand_type']) && strcasecmp($pr['brand_type'], 'n/a') !== 0) 
                    ? " &bull; " . ucwords(strtolower($pr['brand_type'])) 
                    : "";
            
            $dosage = (!empty($pr['dosage']) && strcasecmp($pr['dosage'], 'n/a') !== 0) 
                    ? " &bull; <span style='color: #42756C; font-weight: bold;'>" . strtoupper($pr['dosage']) . "</span>" 
                    : "";
            
            $extraInfo = $type . $dosage;
        }
        
        // Inline style for PDF compatibility
        $metaData = "<div style='font-size: 8px; color: #777; margin-top: 2px; text-transform: uppercase;'>{$brandName}{$extraInfo}</div>";

        $prodRowsHtml .= "<tr>
            <td style='padding: 8px; border: 1px solid #ddd;'>
                <div style='font-weight: bold; color: #333; font-size: 9px;'>" . ucwords(strtolower(htmlspecialchars($pr['name']))) . "</div>
                $metaData
            </td>
            <td style='padding: 8px; border: 1px solid #ddd; text-align:center;'>{$pr['qty']} Units</td>
            <td style='padding: 8px; border: 1px solid #ddd; text-align:right;'>PHP " . number_format($pr['revenue'], 2) . "</td>
        </tr>";
    }

    // 3. BRANCH OVERVIEW (Strict)
    $branchesStmt = $pdo->prepare("SELECT b.branch_id, b.name, b.status, b.is_maintenance, 
        (SELECT COALESCE(SUM(p.amount), 0) FROM payments_tb p 
         WHERE p.branch_id = b.branch_id 
         AND p.subscription_id IS NULL 
         AND LOWER(p.payment_status) IN ('paid', 'completed', 'success', 'fully paid', 'billed')
         AND (p.payment_type != 'appointment' OR EXISTS (SELECT 1 FROM appointments_tb a WHERE a.order_id = p.order_id AND LOWER(a.status) NOT IN ('pending', 'confirmed'))) 
         $revDateClause) as branch_revenue 
        FROM clinic_branches_tb b WHERE b.clinic_id = :cid AND LOWER(b.status) = 'approved'");
    $branchesStmt->execute([':cid' => $clinic_id]);
    $branchesData = $branchesStmt->fetchAll();

    $branchRowsHtml = ""; $grandTotalBranchRev = 0;
    foreach ($branchesData as $b) {
        $grandTotalBranchRev += $b['branch_revenue'];
        $branch_status = $b['is_maintenance'] ? 'Maintenance' : ucwords(strtolower($b['status']));
        $branchRowsHtml .= "<tr>
            <td style='padding: 8px; border: 1px solid #ddd; text-align:center;'>{$b['branch_id']}</td>
            <td style='padding: 8px; border: 1px solid #ddd;'>" . ucwords(strtolower(htmlspecialchars($b['name']))) . "</td>
            <td style='padding: 8px; border: 1px solid #ddd; text-align:center;'>$branch_status</td>
            <td style='padding: 8px; border: 1px solid #ddd; text-align:right;'>PHP " . number_format($b['branch_revenue'], 2) . "</td>
        </tr>";
    }

    // Logo Processing
    $platformLogoHtml = '';
    if (!empty($platform['platform_logo'])) {
        $pLogoPath = __DIR__ . '/../../../../' . $platform['platform_logo']; 
        if(file_exists($pLogoPath)) {
            $pType = pathinfo($pLogoPath, PATHINFO_EXTENSION);
            $pBase64 = 'data:image/' . $pType . ';base64,' . base64_encode(file_get_contents($pLogoPath));
            $platformLogoHtml = "<img src='{$pBase64}' style='height: 12px; vertical-align: middle; margin-right: 4px;' />";
        }
    }

    // --- HTML RENDER ---
    $html = "<html><head><style>
            body { font-family: 'DejaVu Sans', sans-serif; color: #333; margin: 0; padding: 0; font-size: 10px; }
            .container { padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .kpi-grid { width: 100%; border-spacing: 5px; margin-bottom: 15px; }
            .kpi-card { background: #1a1a1a; color: white; padding: 8px; border-radius: 4px; text-align: center; }
            .kpi-label { font-size: 7px; text-transform: uppercase; opacity: 0.8; }
            .kpi-value { font-size: 10px; font-weight: bold; display: block; margin-top: 2px; }
            .section-title { background: #f4f4f4; padding: 6px; font-weight: bold; text-transform: uppercase; font-size: 9px; border-left: 4px solid #42756C; margin-top: 15px; }
            .data-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            .data-table th { background: #fafafa; border: 1px solid #ddd; padding: 6px; font-size: 8px; text-align: left; text-transform: uppercase; }
            .total-row { background: #eee; font-weight: bold; }
        </style></head><body>
        <div class='container'>
            <div class='header'>
                <h2 style='margin:0; color: #42756C;'>$clinic_display_name</h2>
                <h3 style='margin:0;'>EXECUTIVE PERFORMANCE REPORT</h3>
                <p style='font-size:8px; color:#666;'>PERIOD: " . strtoupper($period) . " | GENERATED: " . date("F d, Y") . "</p>
            </div>
            <table class='kpi-grid'>
                <tr>
                    <td class='kpi-card'><span class='kpi-label'>Revenue</span><span class='kpi-value'>PHP " . number_format($totalRevenue, 2) . "</span></td>
                    <td class='kpi-card'><span class='kpi-label'>Pending Revenue</span><span class='kpi-value'>PHP " . number_format($pendingRevenue, 2) . "</span></td>
                    <td class='kpi-card'><span class='kpi-label'>Total Reservations</span><span class='kpi-value'>" . number_format($totalReservations) . "</span></td>
                </tr>
                <tr>
                    <td class='kpi-card'><span class='kpi-label'>Product Sales</span><span class='kpi-value'>" . number_format($totalProductUnits) . " Units</span></td>
                    <td class='kpi-card'><span class='kpi-label'>Active Staff</span><span class='kpi-value'>" . number_format($totalStaff) . "</span></td>
                    <td class='kpi-card'><span class='kpi-label'>Active Branches</span><span class='kpi-value'>" . number_format($totalBranches) . "</span></td>
                </tr>
            </table>

            <div class='section-title'>Branch Overview</div>
            <table class='data-table'>
                <thead><tr><th style='text-align:center;'>ID</th><th>Branch Name</th><th style='text-align:center;'>Status</th><th style='text-align:right;'>Total Revenue</th></tr></thead>
                <tbody>$branchRowsHtml</tbody>
                <tfoot><tr class='total-row'>
                    <td colspan='3' style='padding: 8px; border: 1px solid #ddd;'>TOTAL CLINIC REVENUE</td>
                    <td style='padding: 8px; border: 1px solid #ddd; text-align:right;'>PHP " . number_format($grandTotalBranchRev, 2) . "</td>
                </tr></tfoot>
            </table>

            <div class='section-title'>Top Performing Services</div>
            <table class='data-table'>
                <thead><tr><th>Service Detail</th><th style='text-align:center;'>Volume</th><th style='text-align:right;'>Total Billings</th></tr></thead>
                <tbody>$itemsHtml</tbody>
                <tfoot><tr class='total-row'>
                    <td style='padding: 8px; border: 1px solid #ddd;'>TOTAL</td>
                    <td style='padding: 8px; border: 1px solid #ddd; text-align:center;'>$grandTotalSvcVol</td>
                    <td style='padding: 8px; border: 1px solid #ddd; text-align:right;'>PHP " . number_format($grandTotalSvcRev, 2) . "</td>
                </tr></tfoot>
            </table>

            <div class='section-title'>Top Performing Products</div>
            <table class='data-table'>
                <thead><tr><th>Product Detail</th><th style='text-align:right;'>Volume</th> <th style='text-align:right;'>Total Billings</th></tr></thead>
                <tbody>$prodRowsHtml</tbody>
                <tfoot><tr class='total-row'>
                    <td style='padding: 8px; border: 1px solid #ddd;'>TOTAL</td>
                    <td style='padding: 8px; border: 1px solid #ddd; text-align:right;'>$grandTotalProdQty Units</td>
                    <td style='padding: 8px; border: 1px solid #ddd; text-align:right;'>PHP " . number_format($grandTotalProdRev, 2) . "</td>
                </tr></tfoot>
            </table>

            <div style='text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; margin-top: 20px; padding-top: 15px; letter-spacing: 0.5px;'>
                <em style='display: block; margin: 8px 0;'>Thank you for trusting {$platformName} to power your clinic's growth!</em>
                <div style='margin-top: 5px; font-size: 8px; color: #bbb;'>
                    Powered by {$platformLogoHtml} <strong style='color: #42756C;'>{$platformName}</strong>
                </div>
            </div>
        </div></body></html>";

    $dompdf = new Dompdf(['isHtml5ParserEnabled' => true, 'isRemoteEnabled' => true]);
    $dompdf->loadHtml($html, 'UTF-8');
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    
    if (ob_get_length()) ob_end_clean();
    $dompdf->stream("Executive_Report_" . date("Ymd") . ".pdf", ["Attachment" => true]);

} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}