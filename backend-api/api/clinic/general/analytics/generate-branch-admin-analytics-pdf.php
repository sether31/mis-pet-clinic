<?php
require_once __DIR__ . '/../../../../vendor/autoload.php'; 
require_once __DIR__ . '/../../../../config/Database.php';

use Dompdf\Dompdf;
use Dompdf\Options;

$branch_id = $_GET['branch_id'] ?? null;
$period = $_GET['period'] ?? 'week';

if (!$branch_id) {
    die("Branch ID is required");
}

function getSqlDateConstraint($period, $column) {
    switch ($period) {
        case 'today': return " AND DATE($column) = CURDATE()";
        case 'month': return " AND MONTH($column) = MONTH(CURDATE()) AND YEAR($column) = YEAR(CURDATE())";
        case 'year':  return " AND YEAR($column) = YEAR(CURDATE())"; 
        case 'all':   return "";
        case 'week':
        default:      return " AND YEARWEEK($column, 1) = YEARWEEK(CURDATE(), 1)"; 
    }
}

try {
    $database = new Database();
    $pdo = $database->pdo;

    $virtualDate = "COALESCE((SELECT MIN(a.start_time) FROM appointments_tb a WHERE a.order_id = p.order_id), p.created_at)";
    $paidStatuses = "'paid', 'completed', 'success', 'fully paid', 'billed'";
    $pendingStatuses = "'pending', 'unpaid', 'partially paid'";

    // 1. FETCH PLATFORM & LOGO
    $platformStmt = $pdo->query("SELECT platform_name, platform_logo FROM platform_settings_tb LIMIT 1");
    $platform = $platformStmt->fetch();
    $platformName = ucwords(strtolower($platform['platform_name'] ?? 'Clinic Platform'));
    
    $platformLogoHtml = '';
    if (!empty($platform['platform_logo'])) {
        $pLogoPath = __DIR__ . '/../../../../' . $platform['platform_logo']; 
        if(file_exists($pLogoPath)) {
            $pType = pathinfo($pLogoPath, PATHINFO_EXTENSION);
            $pBase64 = 'data:image/' . $pType . ';base64,' . base64_encode(file_get_contents($pLogoPath));
            $platformLogoHtml = "<img src='{$pBase64}' style='height: 12px; vertical-align: middle; margin-right: 4px;' />";
        }
    }

    $branchStmt = $pdo->prepare("SELECT name FROM clinic_branches_tb WHERE branch_id = :bid");
    $branchStmt->execute([':bid' => $branch_id]);
    $branch_name = ucwords(strtolower($branchStmt->fetchColumn() ?: 'Branch'));

    // 2. KPI DATA
    $billDateClause = getSqlDateConstraint($period, $virtualDate);
    
    $billStmt = $pdo->prepare("SELECT SUM(p.amount) FROM payments_tb p WHERE p.branch_id = :bid AND LOWER(p.payment_status) IN ($paidStatuses) AND p.subscription_id IS NULL $billDateClause");
    $billStmt->execute([':bid' => $branch_id]);
    $totalBillings = $billStmt->fetchColumn() ?: 0;

    $pendingStmt = $pdo->prepare("SELECT SUM(p.amount) FROM payments_tb p WHERE p.branch_id = :bid AND LOWER(p.payment_status) IN ($pendingStatuses) AND p.subscription_id IS NULL $billDateClause");
    $pendingStmt->execute([':bid' => $branch_id]);
    $totalPending = $pendingStmt->fetchColumn() ?: 0;

    $apptDateClause = getSqlDateConstraint($period, 'a.start_time');
    $apptCountStmt = $pdo->prepare("SELECT COUNT(*) FROM appointments_tb a WHERE a.branch_id = :bid AND LOWER(a.status) = 'completed' $apptDateClause");
    $apptCountStmt->execute([':bid' => $branch_id]);
    $totalAppts = $apptCountStmt->fetchColumn() ?: 0;

    $prodCountStmt = $pdo->prepare("SELECT SUM(oi.quantity) FROM order_items_tb oi JOIN payments_tb p ON oi.order_id = p.order_id WHERE p.branch_id = :bid AND oi.product_id IS NOT NULL AND LOWER(p.payment_status) IN ($paidStatuses) $billDateClause");
    $prodCountStmt->execute([':bid' => $branch_id]);
    $totalProducts = $prodCountStmt->fetchColumn() ?: 0;

    // 3. TABLE DATA: TOP SERVICES
    $svcStmt = $pdo->prepare("SELECT COALESCE(bs.custom_name, 'Unknown Service') as name, COUNT(oi.service_id) as count, SUM(oi.subtotal) as revenue FROM order_items_tb oi JOIN payments_tb p ON oi.order_id = p.order_id LEFT JOIN branch_service_tb bs ON oi.service_id = bs.branch_service_id WHERE p.branch_id = :bid AND LOWER(p.payment_status) IN ($paidStatuses) AND oi.service_id IS NOT NULL $billDateClause GROUP BY bs.custom_name ORDER BY revenue DESC LIMIT 10");
    $svcStmt->execute([':bid' => $branch_id]);
    $svcData = $svcStmt->fetchAll();

    $svcRows = ""; $svcTotalRev = 0; $svcTotalVol = 0;
    foreach ($svcData as $s) {
        $svcTotalRev += $s['revenue'];
        $svcTotalVol += $s['count'];
        $svcRows .= "<tr>
            <td style='padding:8px; border:1px solid #ddd;'>".ucwords(strtolower(htmlspecialchars($s['name'])))."</td>
            <td align='right' style='padding:8px; border:1px solid #ddd;'>PHP ".number_format($s['revenue'],2)."</td>
            <td align='center' style='padding:8px; border:1px solid #ddd;'>{$s['count']}</td>
        </tr>";
    }

    // 4. TABLE DATA: TOP PRODUCTS
    $pStmt = $pdo->prepare("SELECT pr.name, SUM(oi.quantity) as sales, SUM(oi.subtotal) as revenue FROM order_items_tb oi JOIN payments_tb p ON oi.order_id = p.order_id JOIN products_tb pr ON oi.product_id = pr.product_id WHERE p.branch_id = :bid AND LOWER(p.payment_status) IN ($paidStatuses) AND oi.product_id IS NOT NULL $billDateClause GROUP BY pr.product_id ORDER BY revenue DESC LIMIT 10");
    $pStmt->execute([':bid' => $branch_id]);
    $prodData = $pStmt->fetchAll();

    $prodRows = ""; $prodTotalRev = 0; $prodTotalQty = 0;
    foreach ($prodData as $p) {
        $prodTotalRev += $p['revenue'];
        $prodTotalQty += $p['sales'];
        $prodRows .= "<tr>
            <td style='padding:8px; border:1px solid #ddd;'>".ucwords(strtolower(htmlspecialchars($p['name'])))."</td>
            <td align='right' style='padding:8px; border:1px solid #ddd;'>PHP ".number_format($p['revenue'],2)."</td>
            <td align='center' style='padding:8px; border:1px solid #ddd;'>".number_format($p['sales'])."</td>
        </tr>";
    }

    $html = "<html><head><style>
            body { font-family: 'DejaVu Sans', sans-serif; color: #333; margin: 0; padding: 0; font-size: 10px; }
            .container { padding: 30px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
            .branch-name { font-size: 16px; font-weight: bold; color: #42756C; margin-bottom: 5px; }
            .kpi-table { width: 100%; border-spacing: 5px; margin-bottom: 10px; }
            .kpi-card { background: #1a1a1a; color: white; padding: 10px; border-radius: 4px; text-align: center; width: 25%; }
            .kpi-label { font-size: 7px; text-transform: uppercase; opacity: 0.8; }
            .kpi-value { font-size: 10px; font-weight: bold; display: block; margin-top: 3px; }
            .section-title { background: #f4f4f4; padding: 6px; font-weight: bold; text-transform: uppercase; font-size: 9px; border-left: 4px solid #42756C; margin-top: 15px; }
            .data-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            .data-table th { background: #fafafa; border: 1px solid #ddd; padding: 8px; font-size: 8px; text-transform: uppercase; text-align: left; }
            .total-row { background: #eee; font-weight: bold; }
        </style></head><body>
        <div class='container'>
            <div class='header'>
                <div class='branch-name'>$branch_name</div>
                <h2 style='margin:0;'>BRANCH PERFORMANCE REPORT</h2>
                <p style='color:#666; font-size:8px; margin-top: 5px;'>PERIOD: ".strtoupper($period)." | GENERATED: ".date("F d, Y h:i A")."</p>
            </div>

            <table class='kpi-table'>
                <tr>
                    <td class='kpi-card'><span class='kpi-label'>Realized Revenue</span><span class='kpi-value'>PHP ".number_format($totalBillings, 2)."</span></td>
                    <td class='kpi-card'><span class='kpi-label'>Pending Payments</span><span class='kpi-value'>PHP ".number_format($totalPending, 2)."</span></td>
                    <td class='kpi-card'><span class='kpi-label'>Appointments</span><span class='kpi-value'>".number_format($totalAppts)."</span></td>
                    <td class='kpi-card'><span class='kpi-label'>Products Sold</span><span class='kpi-value'>".number_format($totalProducts)."</span></td>
                </tr>
            </table>

            <div class='section-title'>Top Performing Services</div>
            <table class='data-table'>
                <thead><tr><th>Service Name</th><th align='center'>Volume</th><th align='center'>Total Billings</th></tr></thead>
                <tbody>$svcRows</tbody>
                <tfoot><tr class='total-row'>
                    <td style='padding:8px; border:1px solid #ddd;'>TOTAL</td>
                    <td align='center' style='padding:8px; border:1px solid #ddd;'>$svcTotalVol</td>
                    <td align='center' style='padding:8px; border:1px solid #ddd;'>PHP ".number_format($svcTotalRev, 2)."</td>
                </tr></tfoot>
            </table>

            <div class='section-title'>Top Product Sales</div>
            <table class='data-table'>
                <thead><tr><th>Product Name</th><th align='center'>Units Sold</th> <th align='center'>Total Billings</th></tr></thead>
                <tbody>$prodRows</tbody>
                <tfoot><tr class='total-row'>
                    <td style='padding:8px; border:1px solid #ddd;'>TOTAL</td>
                    <td align='center' style='padding:8px; border:1px solid #ddd;'>$prodTotalQty</td>
                    <td align='center' style='padding:8px; border:1px solid #ddd;'>PHP ".number_format($prodTotalRev, 2)."</td>
                </tr></tfoot>
            </table>

            <div style='text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; margin-top: 20px; padding-top: 15px;'>
                <em style='display: block; margin: 8px 0;'>Thank you for trusting us with your pet's care!</em>
                <div style='margin-top: 15px; font-size: 8px; color: #bbb;'>
                    Powered by {$platformLogoHtml} <strong style='color: #42756C;'>{$platformName}</strong>
                </div>
            </div>
        </div></body></html>";

    $dompdf = new Dompdf(['isHtml5ParserEnabled' => true, 'isRemoteEnabled' => true]);
    $dompdf->loadHtml($html, 'UTF-8');
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    if (ob_get_length()) ob_end_clean();
    $dompdf->stream("Performance_Report_{$branch_name}.pdf", ["Attachment" => true]);
} catch (Exception $e) { die("Error: " . $e->getMessage()); }