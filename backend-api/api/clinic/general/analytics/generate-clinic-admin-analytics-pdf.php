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

/**
 * Enhanced Date Constraint using Virtual Date logic
 * Attributes revenue to appointment start time if it exists.
 */
function getSqlDateConstraint($period, $column) {
    switch ($period) {
        case 'week':
            return "YEARWEEK($column, 1) = YEARWEEK(CURDATE(), 1)";
        case 'month':
            return "MONTH($column) = MONTH(CURDATE()) AND YEAR($column) = YEAR(CURDATE())";
        case 'year':
            return "YEAR($column) = YEAR(CURDATE())";
        case 'today':
        default:
            return "DATE($column) = CURDATE()";
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

    // 2. VIRTUAL DATE & STATUS DEFINITIONS
    $virtualDate = "COALESCE((SELECT MIN(a.start_time) FROM appointments_tb a WHERE a.order_id = p.order_id), p.created_at)";
    $paidStatuses = "'paid', 'completed', 'success', 'fully paid', 'billed'";
    $pendingStatuses = "'pending', 'unpaid', 'partially paid'";
    
    $revDateClause = getSqlDateConstraint($period, $virtualDate);
    $apptDateClause = getSqlDateConstraint($period, "a.start_time");
    $branchSub = "SELECT branch_id FROM clinic_branches_tb WHERE clinic_id = :cid";

    // KPI: Realized Revenue
    $revStmt = $pdo->prepare("SELECT COALESCE(SUM(p.amount), 0) FROM payments_tb p WHERE p.branch_id IN ($branchSub) AND LOWER(p.payment_status) IN ($paidStatuses) AND p.subscription_id IS NULL AND $revDateClause");
    $revStmt->execute([':cid' => $clinic_id]);
    $totalRevenue = $revStmt->fetchColumn();

    // KPI: Pending Revenue (New)
    $pendStmt = $pdo->prepare("SELECT COALESCE(SUM(p.amount), 0) FROM payments_tb p WHERE p.branch_id IN ($branchSub) AND LOWER(p.payment_status) IN ($pendingStatuses) AND p.subscription_id IS NULL AND $revDateClause");
    $pendStmt->execute([':cid' => $clinic_id]);
    $pendingRevenue = $pendStmt->fetchColumn();

    // KPI: Total Appointments
    $apptStmt = $pdo->prepare("SELECT COUNT(*) FROM appointments_tb a WHERE a.branch_id IN ($branchSub) AND LOWER(a.status) = 'completed' AND $apptDateClause");
    $apptStmt->execute([':cid' => $clinic_id]);
    $totalAppts = $apptStmt->fetchColumn();

    // KPI: Total Product Sales (Units)
    $prodSalesKpiStmt = $pdo->prepare("SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items_tb oi JOIN payments_tb p ON oi.order_id = p.order_id WHERE p.branch_id IN ($branchSub) AND LOWER(p.payment_status) IN ($paidStatuses) AND oi.product_id IS NOT NULL AND $revDateClause");
    $prodSalesKpiStmt->execute([':cid' => $clinic_id]);
    $totalProductUnits = $prodSalesKpiStmt->fetchColumn();

    // KPI: Counts
    $branchCountStmt = $pdo->prepare("SELECT COUNT(*) FROM clinic_branches_tb WHERE clinic_id = :cid AND LOWER(status) = 'approved'");
    $branchCountStmt->execute([':cid' => $clinic_id]);
    $totalBranches = $branchCountStmt->fetchColumn();

    $staffStmt = $pdo->prepare("SELECT COUNT(*) FROM branch_staff_tb WHERE branch_id IN ($branchSub) AND status = 1");
    $staffStmt->execute([':cid' => $clinic_id]);
    $totalStaff = $staffStmt->fetchColumn();

    // 3. BRANCHES OVERVIEW
    $branchesStmt = $pdo->prepare("SELECT branch_id, name, status, is_maintenance FROM clinic_branches_tb WHERE clinic_id = :cid AND LOWER(status) = 'approved'");
    $branchesStmt->execute([':cid' => $clinic_id]);
    $branchesData = $branchesStmt->fetchAll();

    $branchRowsHtml = "";
    foreach ($branchesData as $b) {
        $branch_status = $b['is_maintenance'] ? 'Maintenance' : ucwords(strtolower($b['status']));
        $branchRowsHtml .= "<tr>
            <td style='padding: 8px; border: 1px solid #ddd; text-align:center;'>ID: {$b['branch_id']}</td>
            <td style='padding: 8px; border: 1px solid #ddd;'>" . ucwords(strtolower(htmlspecialchars($b['name']))) . "</td>
            <td style='padding: 8px; border: 1px solid #ddd; text-align:center;'>$branch_status</td>
        </tr>";
    }

    // 4. TOP SERVICES
    $svcStmt = $pdo->prepare("SELECT bs.custom_name as name, COUNT(oi.service_id) as count, SUM(oi.subtotal) as revenue FROM order_items_tb oi JOIN payments_tb p ON oi.order_id = p.order_id JOIN branch_service_tb bs ON oi.service_id = bs.branch_service_id WHERE p.branch_id IN ($branchSub) AND LOWER(p.payment_status) IN ($paidStatuses) AND oi.service_id IS NOT NULL AND $revDateClause GROUP BY bs.custom_name ORDER BY revenue DESC LIMIT 5");
    $svcStmt->execute([':cid' => $clinic_id]);
    $topServices = $svcStmt->fetchAll();

    $itemsHtml = "";
    foreach ($topServices as $s) {
        $itemsHtml .= "<tr>
            <td style='padding: 8px; border: 1px solid #ddd;'><b>" . ucwords(strtolower(htmlspecialchars($s['name']))) . "</b><br><small>PHP " . number_format($s['revenue'], 2) . "</small></td>
            <td align='right' style='padding: 8px; border: 1px solid #ddd;'>{$s['count']} Bookings</td>
        </tr>";
    }

    // 5. TOP PRODUCTS
    $prdStmt = $pdo->prepare("SELECT pr.name, SUM(oi.quantity) as qty, SUM(oi.subtotal) as revenue FROM order_items_tb oi JOIN payments_tb p ON oi.order_id = p.order_id JOIN products_tb pr ON oi.product_id = pr.product_id WHERE p.branch_id IN ($branchSub) AND LOWER(p.payment_status) IN ($paidStatuses) AND oi.product_id IS NOT NULL AND $revDateClause GROUP BY pr.name ORDER BY revenue DESC LIMIT 5");
    $prdStmt->execute([':cid' => $clinic_id]);
    $topProducts = $prdStmt->fetchAll();

    $prodRowsHtml = "";
    foreach ($topProducts as $pr) {
        $prodRowsHtml .= "<tr>
            <td style='padding: 8px; border: 1px solid #ddd;'><b>" . ucwords(strtolower(htmlspecialchars($pr['name']))) . "</b><br><small>PHP " . number_format($pr['revenue'], 2) . "</small></td>
            <td align='right' style='padding: 8px; border: 1px solid #ddd;'>{$pr['qty']} Units</td>
        </tr>";
    }

    // 6. LOGO & RENDER
    $platformLogoHtml = '';
    if (!empty($platform['platform_logo'])) {
        $pLogoPath = __DIR__ . '/../../../../' . $platform['platform_logo']; 
        if(file_exists($pLogoPath)) {
            $pType = pathinfo($pLogoPath, PATHINFO_EXTENSION);
            $pBase64 = 'data:image/' . $pType . ';base64,' . base64_encode(file_get_contents($pLogoPath));
            $platformLogoHtml = "<img src='{$pBase64}' style='height: 12px; vertical-align: middle; margin-right: 4px;' />";
        }
    }

    $html = "
    <html>
    <head>
        <style>
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
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h2 style='margin:0; color: #42756C;'>$clinic_display_name</h2>
                <h3 style='margin:0;'>EXECUTIVE PERFORMANCE REPORT</h3>
                <p style='font-size:8px; color:#666;'>PERIOD: " . strtoupper($period) . " | GENERATED: " . date("F d, Y") . "</p>
            </div>

            <table class='kpi-grid'>
                <tr>
                    <td class='kpi-card'><span class='kpi-label'>Realized Revenue</span><span class='kpi-value'>PHP " . number_format($totalRevenue, 2) . "</span></td>
                    <td class='kpi-card'><span class='kpi-label'>Pending Revenue</span><span class='kpi-value'>PHP " . number_format($pendingRevenue, 2) . "</span></td>
                    <td class='kpi-card'><span class='kpi-label'>Appointments</span><span class='kpi-value'>" . number_format($totalAppts) . "</span></td>
                </tr>
                <tr>
                    <td class='kpi-card'><span class='kpi-label'>Product Sales</span><span class='kpi-value'>" . number_format($totalProductUnits) . " Units</span></td>
                    <td class='kpi-card'><span class='kpi-label'>Active Branches</span><span class='kpi-value'>" . number_format($totalBranches) . "</span></td>
                    <td class='kpi-card'><span class='kpi-label'>Total Staff</span><span class='kpi-value'>" . number_format($totalStaff) . "</span></td>
                </tr>
            </table>

            <div class='section-title'>Branch Overview</div>
            <table class='data-table'>
                <thead><tr><th style='text-align:center;'>ID</th><th>Branch Name</th><th style='text-align:center;'>Status</th></tr></thead>
                <tbody>$branchRowsHtml</tbody>
            </table>

            <div class='section-title'>Top Performing Services</div>
            <table class='data-table'>
                <thead><tr><th>Service Detail</th><th style='text-align:right;'>Volume</th></tr></thead>
                <tbody>$itemsHtml</tbody>
            </table>

            <div class='section-title'>Top Performing Products</div>
            <table class='data-table'>
                <thead><tr><th>Product Detail</th><th style='text-align:right;'>Volume</th></tr></thead>
                <tbody>$prodRowsHtml</tbody>
            </table>

            <div style='text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; margin-top: 30px; padding-top: 15px;'>
                Report generated on " . date("F d, Y h:i A") . "
                <div style='margin-top: 10px;'>
                    {$platformLogoHtml} <strong style='color: #42756C;'>$platformName</strong>
                </div>
            </div>
        </div>
    </body>
    </html>";

    $dompdf = new Dompdf(['isHtml5ParserEnabled' => true, 'isRemoteEnabled' => true]);
    $dompdf->loadHtml($html, 'UTF-8');
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    
    if (ob_get_length()) ob_end_clean();
    $dompdf->stream("Executive_Report_" . date("Ymd") . ".pdf", ["Attachment" => true]);

} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}