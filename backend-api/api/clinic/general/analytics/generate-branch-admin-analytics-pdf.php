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

function getSqlDateConstraint($period, $alias = '') {
    $col = $alias ? "$alias.created_at" : "created_at";
    switch ($period) {
        case 'today': 
            return "AND DATE($col) = CURDATE()";
        case 'month': 
            return "AND MONTH($col) = MONTH(CURDATE()) AND YEAR($col) = YEAR(CURDATE())";
        case 'year':  
            return "AND YEAR($col) = YEAR(CURDATE())"; 
        case 'week':
        default:      
            return "AND DATE($col) >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)";
    }
}

try {
    $database = new Database();
    $pdo = $database->pdo;

    // 1. FETCH CLINIC DETAILS
    $platformStmt = $pdo->query("SELECT platform_name, platform_logo FROM platform_settings_tb LIMIT 1");
    $platform = $platformStmt->fetch();
    $platformName = $platform['platform_name'] ?? 'Clinic Platform';
    
    $branchStmt = $pdo->prepare("SELECT name, logo_picture FROM clinic_branches_tb WHERE branch_id = :bid");
    $branchStmt->execute([':bid' => $branch_id]);
    $branchData = $branchStmt->fetch();
    $branch_name = $branchData['name'] ?? 'Branch';

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

    $clinicLogoHtml = '';
    if (!empty($branchData['logo_picture'])) {
        $logoPath = __DIR__ . '/../../../../' . $branchData['logo_picture'];
        if (file_exists($logoPath)) {
            $type = pathinfo($logoPath, PATHINFO_EXTENSION);
            $base64 = 'data:image/' . $type . ';base64,' . base64_encode(file_get_contents($logoPath));
            $clinicLogoHtml = "<td valign='middle' style='padding-right: 8px;'><img src='{$base64}' style='max-height: 24px; display: block; border-radius: 4px;' /></td>";
        }
    }

    // 2. DATA FETCHING
    $dateClauseNoAlias = getSqlDateConstraint($period);
    $dateClauseAliasO = getSqlDateConstraint($period, 'o');

    // KPI: Total Billings
    $billStmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM payments_tb WHERE branch_id = :bid AND LOWER(payment_status) NOT IN ('cancelled', 'failed', 'refunded') $dateClauseNoAlias");
    $billStmt->execute([':bid' => $branch_id]);
    $totalBillings = $billStmt->fetchColumn();

    // KPI: Total Products Sold
    $prodCountStmt = $pdo->prepare("SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items_tb oi JOIN order_tb o ON oi.order_id = o.order_id WHERE o.branch_id = :bid AND oi.product_id IS NOT NULL AND LOWER(o.order_status) IN ('completed', 'paid') $dateClauseAliasO");
    $prodCountStmt->execute([':bid' => $branch_id]);
    $totalProducts = $prodCountStmt->fetchColumn();

    // KPI: Total Appointments
    $apptCountStmt = $pdo->prepare("SELECT COUNT(*) FROM appointments_tb WHERE branch_id = :bid AND LOWER(status) IN ('completed', 'confirmed', 'billed') $dateClauseNoAlias");
    $apptCountStmt->execute([':bid' => $branch_id]);
    $totalAppts = $apptCountStmt->fetchColumn();

    // 3. SEPARATED: TOP SERVICES
    $svcStmt = $pdo->prepare("
        SELECT 
            bs.custom_name as name, 
            COUNT(oi.order_item_id) as count,
            SUM(oi.price * oi.quantity) as svc_revenue
        FROM order_items_tb oi 
        JOIN branch_service_tb bs ON oi.service_id = bs.branch_service_id 
        JOIN order_tb o ON oi.order_id = o.order_id 
        WHERE o.branch_id = :bid AND oi.service_id IS NOT NULL 
        $dateClauseAliasO 
        GROUP BY bs.branch_service_id 
        ORDER BY count DESC 
        LIMIT 10
    ");
    $svcStmt->execute([':bid' => $branch_id]);
    $topServices = $svcStmt->fetchAll();

    // 4. SEPARATED: TOP PRODUCTS (Includes all sales)
    $pStmt = $pdo->prepare("
        SELECT 
            pr.name, 
            SUM(oi.quantity) as sales,
            SUM(oi.price * oi.quantity) as prod_revenue
        FROM order_items_tb oi 
        JOIN products_tb pr ON oi.product_id = pr.product_id 
        JOIN order_tb o ON oi.order_id = o.order_id 
        WHERE o.branch_id = :bid AND oi.product_id IS NOT NULL 
        AND LOWER(o.order_status) IN ('completed', 'paid') 
        $dateClauseAliasO 
        GROUP BY pr.product_id 
        ORDER BY sales DESC 
        LIMIT 10
    ");
    $pStmt->execute([':bid' => $branch_id]);
    $topProducts = $pStmt->fetchAll();

    // 5. HTML CONSTRUCTION
    $itemsHtml = "";
    foreach ($topServices as $s) {
        $itemsHtml .= "<tr>
            <td style='padding: 10px; border: 1px solid #ddd;'>
                <div style='font-weight: bold;'>" . htmlspecialchars($s['name']) . "</div>
                <div style='color: #666; font-size: 8px;'>Service Revenue: PHP " . number_format($s['svc_revenue'], 2) . "</div>
            </td>
            <td align='right' style='padding: 10px; border: 1px solid #ddd;'>{$s['count']}</td>
        </tr>";
    }

    $prodHtml = "";
    foreach ($topProducts as $p) {
        $prodHtml .= "<tr>
            <td style='padding: 10px; border: 1px solid #ddd;'>
                <div style='font-weight: bold;'>" . htmlspecialchars($p['name']) . "</div>
                <div style='color: #666; font-size: 8px;'>Product Revenue: PHP " . number_format($p['prod_revenue'], 2) . "</div>
            </td>
            <td align='right' style='padding: 10px; border: 1px solid #ddd;'>" . number_format($p['sales']) . "</td>
        </tr>";
    }

    $html = "
    <html>
    <head>
        <meta http-equiv='Content-Type' content='text/html; charset=utf-8'/>
        <style>
            body { font-family: 'DejaVu Sans', sans-serif; color: #333; margin: 0; padding: 0; }
            .container { padding: 30px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .branch-name { display: inline-block; vertical-align: middle; font-size: 14px; font-weight: bold; color: #42756C; text-transform: uppercase; letter-spacing: 2px; }
            .kpi-table { width: 100%; border-spacing: 5px; margin-bottom: 10px; table-layout: fixed; }
            .kpi-card { background: #1a1a1a; color: white; padding: 12px; border-radius: 6px; text-align: center; }
            .kpi-label { font-size: 8px; text-transform: uppercase; opacity: 0.8; letter-spacing: 1px; }
            .kpi-value { font-size: 13px; font-weight: bold; margin-top: 3px; display: block; }
            .section-title { background: #f4f4f4; padding: 8px; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #111; margin-top: 20px; border-left: 4px solid #42756C; }
            .data-table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 11px; }
            .data-table th { text-align: left; font-size: 9px; text-transform: uppercase; color: #333; padding: 8px; background: #fafafa; border: 1px solid #ddd; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <table align='center' style='margin: 0 auto 5px auto; border-collapse: collapse;'>
                    <tr>
                        {$clinicLogoHtml}
                        <td valign='middle'><div class='branch-name'>" . htmlspecialchars($branch_name) . "</div></td>
                    </tr>
                </table>
                <h2 style='margin:0; font-size: 20px;'>PERFORMANCE REPORT</h2>
                <p style='color:#666; font-size:9px; margin-top: 5px; text-transform: uppercase;'>Period: $period | Generated: " . date("F d, Y") . "</p>
            </div>

            <table class='kpi-table'>
                <tr>
                    <td class='kpi-card'>
                        <span class='kpi-label'>Total Billings</span><br>
                        <span class='kpi-value'>PHP " . number_format($totalBillings, 2) . "</span>
                    </td>
                    <td class='kpi-card'>
                        <span class='kpi-label'>Products Sold</span><br>
                        <span class='kpi-value'>" . number_format($totalProducts) . " Units</span>
                    </td>
                    <td class='kpi-card'>
                        <span class='kpi-label'>Appointments</span><br>
                        <span class='kpi-value'>" . number_format($totalAppts) . " Bookings</span>
                    </td>
                </tr>
            </table>

            <div class='section-title'>Top Performing Services</div>
            <table class='data-table'>
                <thead><tr><th>Service Name</th><th align='right'>Completed</th></tr></thead>
                <tbody>$itemsHtml</tbody>
            </table>

            <div class='section-title'>Top Product Sales</div>
            <table class='data-table'>
                <thead><tr><th>Product Name</th><th align='right'>Units Sold</th></tr></thead>
                <tbody>$prodHtml</tbody>
            </table>

            <div style='text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; margin-top: 30px; padding-top: 15px;'>
                Analytics generated on " . date("F d, Y h:i A") . "
                <div style='margin-top: 10px;'>
                    {$platformLogoHtml} <strong style='color: #42756C;'>$platformName</strong>
                </div>
            </div>
        </div>
    </body>
    </html>";

    $options = new Options();
    $options->set('isHtml5ParserEnabled', true);
    $options->set('isRemoteEnabled', true);
    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html, 'UTF-8');
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    
    if (ob_get_length()) ob_end_clean();
    $dompdf->stream("Performance_Report_{$branch_name}.pdf", ["Attachment" => true]);

} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}