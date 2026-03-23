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
        case 'today': return "AND DATE($column) = CURDATE()";
        case 'month': return "AND MONTH($column) = MONTH(CURDATE()) AND YEAR($column) = YEAR(CURDATE())";
        case 'year':  return "AND YEAR($column) = YEAR(CURDATE())"; 
        case 'week':
        default:      return "AND YEARWEEK($column, 1) = YEARWEEK(CURDATE(), 1)"; 
    }
}

try {
    $database = new Database();
    $pdo = $database->pdo;

    // The Virtual Date logic looks for the appointment time, falling back to payment creation date
    $virtualDate = "COALESCE(
        (SELECT MIN(a.start_time) FROM appointments_tb a WHERE a.order_id = p.order_id), 
        p.created_at
    )";

    // 1. FETCH CLINIC DETAILS
    $platformStmt = $pdo->query("SELECT platform_name, platform_logo FROM platform_settings_tb LIMIT 1");
    $platform = $platformStmt->fetch();
    $platformName = ucwords($platform['platform_name'] ?? 'Clinic Platform');
    
    $branchStmt = $pdo->prepare("SELECT name, logo_picture FROM clinic_branches_tb WHERE branch_id = :bid");
    $branchStmt->execute([':bid' => $branch_id]);
    $branchData = $branchStmt->fetch();
    $branch_name = ucwords($branchData['name'] ?? 'Branch');

    // 2. DATA FETCHING - KPI CARD DATA
    $billDateClause = getSqlDateConstraint($period, $virtualDate);
    
    // KPI: Realized Revenue (Paid/Completed)
    $billStmt = $pdo->prepare("
        SELECT SUM(p.amount) 
        FROM payments_tb p 
        WHERE p.branch_id = :bid 
        AND LOWER(p.payment_status) IN ('paid', 'completed', 'success', 'fully paid', 'billed') 
        AND p.subscription_id IS NULL 
        $billDateClause
    ");
    $billStmt->execute([':bid' => $branch_id]);
    $totalBillings = $billStmt->fetchColumn() ?: 0;

    // KPI: Pending Payments
    $pendingStmt = $pdo->prepare("
        SELECT SUM(p.amount) 
        FROM payments_tb p 
        WHERE p.branch_id = :bid 
        AND LOWER(p.payment_status) IN ('pending', 'unpaid', 'partially paid')
        AND p.subscription_id IS NULL 
        $billDateClause
    ");
    $pendingStmt->execute([':bid' => $branch_id]);
    $totalPending = $pendingStmt->fetchColumn() ?: 0;

    // KPI: Total Products Sold
    $orderDateClause = getSqlDateConstraint($period, 'o.updated_at');
    $prodCountStmt = $pdo->prepare("
        SELECT SUM(oi.quantity) 
        FROM order_items_tb oi 
        JOIN order_tb o ON oi.order_id = o.order_id 
        WHERE o.branch_id = :bid AND oi.product_id IS NOT NULL 
        AND LOWER(o.order_status) IN ('completed', 'paid') 
        $orderDateClause
    ");
    $prodCountStmt->execute([':bid' => $branch_id]);
    $totalProducts = $prodCountStmt->fetchColumn() ?: 0;

    // KPI: Appointments
    $apptDateClause = getSqlDateConstraint($period, 'a.start_time');
    $apptCountStmt = $pdo->prepare("
        SELECT COUNT(*) 
        FROM appointments_tb a 
        WHERE a.branch_id = :bid 
        AND LOWER(a.status) = 'completed' 
        $apptDateClause
    ");
    $apptCountStmt->execute([':bid' => $branch_id]);
    $totalAppts = $apptCountStmt->fetchColumn() ?: 0;

    // 3. TOP SERVICES & PRODUCTS (logic same as before)
    $orderVirtualDate = "COALESCE((SELECT MIN(a.start_time) FROM appointments_tb a WHERE a.order_id = o.order_id), o.created_at)";
    $svcDateClause = getSqlDateConstraint($period, $orderVirtualDate);
    $svcStmt = $pdo->prepare("SELECT bs.custom_name as name, COUNT(oi.order_item_id) as count, SUM(oi.subtotal) as svc_revenue FROM order_items_tb oi JOIN branch_service_tb bs ON oi.service_id = bs.branch_service_id JOIN order_tb o ON oi.order_id = o.order_id WHERE o.branch_id = :bid AND oi.service_id IS NOT NULL $svcDateClause GROUP BY bs.branch_service_id ORDER BY count DESC LIMIT 10");
    $svcStmt->execute([':bid' => $branch_id]);
    $topServices = $svcStmt->fetchAll();

    $pStmt = $pdo->prepare("SELECT pr.name, SUM(oi.quantity) as sales, SUM(oi.subtotal) as prod_revenue FROM order_items_tb oi JOIN products_tb pr ON oi.product_id = pr.product_id JOIN order_tb o ON oi.order_id = o.order_id WHERE o.branch_id = :bid AND oi.product_id IS NOT NULL AND LOWER(o.order_status) IN ('completed', 'paid') $orderDateClause GROUP BY pr.product_id ORDER BY sales DESC LIMIT 10");
    $pStmt->execute([':bid' => $branch_id]);
    $topProducts = $pStmt->fetchAll();

    // 4. HTML CONSTRUCTION
    $itemsHtml = "";
    foreach ($topServices as $s) {
        $itemsHtml .= "<tr><td style='padding:10px; border:1px solid #ddd;'><div style='font-weight:bold;'>".ucwords(htmlspecialchars($s['name']))."</div><div style='color:#666; font-size:8px;'>Service Rev: PHP ".number_format($s['svc_revenue'],2)."</div></td><td align='right' style='padding:10px; border:1px solid #ddd;'>{$s['count']}</td></tr>";
    }
    $prodHtml = "";
    foreach ($topProducts as $p) {
        $prodHtml .= "<tr><td style='padding:10px; border:1px solid #ddd;'><div style='font-weight:bold;'>".ucwords(htmlspecialchars($p['name']))."</div><div style='color:#666; font-size:8px;'>Prod Rev: PHP ".number_format($p['prod_revenue'],2)."</div></td><td align='right' style='padding:10px; border:1px solid #ddd;'>".number_format($p['sales'])."</td></tr>";
    }

    $html = "
    <html>
    <head>
        <meta http-equiv='Content-Type' content='text/html; charset=utf-8'/>
        <style>
            body { font-family: 'DejaVu Sans', sans-serif; color: #333; margin: 0; padding: 0; }
            .container { padding: 30px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .branch-name { font-size: 14px; font-weight: bold; color: #42756C; letter-spacing: 2px; }
            .kpi-table { width: 100%; border-spacing: 8px; margin-bottom: 10px; }
            .kpi-card { background: #1a1a1a; color: white; padding: 15px; border-radius: 6px; text-align: center; width: 50%; }
            .kpi-label { font-size: 9px; text-transform: uppercase; opacity: 0.8; letter-spacing: 1px; }
            .kpi-value { font-size: 14px; font-weight: bold; margin-top: 5px; display: block; }
            .section-title { background: #f4f4f4; padding: 8px; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #111; margin-top: 20px; border-left: 4px solid #42756C; }
            .data-table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 11px; }
            .data-table th { text-align: left; font-size: 9px; text-transform: uppercase; color: #333; padding: 8px; background: #fafafa; border: 1px solid #ddd; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <table align='center' style='margin: 0 auto 5px auto; border-collapse: collapse;'>
                    <tr><td valign='middle'><div class='branch-name'>$branch_name</div></td></tr>
                </table>
                <h2 style='margin:0; font-size: 20px;'>PERFORMANCE REPORT</h2>
                <p style='color:#666; font-size:9px; margin-top: 5px; text-transform: uppercase;'>Period: ".ucwords($period)." | Generated: ".date("F d, Y")."</p>
            </div>

            <table class='kpi-table'>
                <tr>
                    <td class='kpi-card'>
                        <span class='kpi-label'>Total Realized Revenue</span><br>
                        <span class='kpi-value'>PHP " . number_format($totalBillings, 2) . "</span>
                    </td>
                    <td class='kpi-card'>
                        <span class='kpi-label'>Pending Payments</span><br>
                        <span class='kpi-value'>PHP " . number_format($totalPending, 2) . "</span>
                    </td>
                </tr>
                <tr>
                    <td class='kpi-card'>
                        <span class='kpi-label'>Completed Appointments</span><br>
                        <span class='kpi-value'>" . number_format($totalAppts) . " Bookings</span>
                    </td>
                    <td class='kpi-card'>
                        <span class='kpi-label'>Inventory Sold</span><br>
                        <span class='kpi-value'>" . number_format($totalProducts) . " Units</span>
                    </td>
                </tr>
            </table>

            <div class='section-title'>Top Performing Services</div>
            <table class='data-table'>
                <thead><tr><th>Service Name</th><th align='right'>Count</th></tr></thead>
                <tbody>$itemsHtml</tbody>
            </table>

            <div class='section-title'>Top Product Sales</div>
            <table class='data-table'>
                <thead><tr><th>Product Name</th><th align='right'>Units Sold</th></tr></thead>
                <tbody>$prodHtml</tbody>
            </table>
        </div>
    </body>
    </html>";

    $options = new Options();
    $options->set('isHtml5ParserEnabled', true);
    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html, 'UTF-8');
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    
    if (ob_get_length()) ob_end_clean();
    $dompdf->stream("Performance_Report_{$branch_name}.pdf", ["Attachment" => true]);

} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}