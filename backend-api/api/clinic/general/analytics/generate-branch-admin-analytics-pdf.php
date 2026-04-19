<?php
require_once __DIR__ . '/../../../../vendor/autoload.php'; 
require_once __DIR__ . '/../../../../config/Database.php';

use Dompdf\Dompdf;
use Dompdf\Options;

$branch_id = $_GET['branch_id'] ?? null;
$period = isset($_GET['period']) ? strtolower(trim($_GET['period'])) : 'today';

if (!$branch_id) {
    die("Branch ID is required");
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
    $pdo->exec("SET time_zone = '+08:00';");

    // 1. FILTERS & LOGIC
    $virtualDate = "CASE 
        WHEN p.payment_type = 'appointment' THEN (SELECT MIN(a.start_time) FROM appointments_tb a WHERE a.order_id = p.order_id)
        WHEN p.payment_type = 'product' THEN (SELECT o.pickup_date FROM order_tb o WHERE o.order_id = p.order_id)
        ELSE p.created_at 
    END";
    
    $dateClause = getSqlDateConstraint($period, $virtualDate);
    $broadCondition = "p.branch_id = :bid AND (p.payment_type != 'appointment' OR EXISTS (SELECT 1 FROM appointments_tb a WHERE a.order_id = p.order_id AND LOWER(a.status) NOT IN ('pending', 'confirmed'))) $dateClause";
    $strictCondition = $broadCondition . " AND LOWER(p.payment_status) IN ('paid', 'completed', 'success', 'fully paid', 'billed')";

    // 2. HEADER INFO
    $platformStmt = $pdo->query("SELECT platform_name, platform_logo FROM platform_settings_tb LIMIT 1");
    $platform = $platformStmt->fetch();
    $platformName = ucwords(strtolower($platform['platform_name'] ?? 'Clinic Platform'));
    
    $branchStmt = $pdo->prepare("SELECT name FROM clinic_branches_tb WHERE branch_id = :bid");
    $branchStmt->execute([':bid' => $branch_id]);
    $branch_name = ucwords(strtolower($branchStmt->fetchColumn() ?: 'Branch'));

    // 3. KPI CALCULATIONS
    $revStmt = $pdo->prepare("SELECT SUM(p.amount) FROM payments_tb p WHERE $strictCondition AND p.subscription_id IS NULL");
    $revStmt->execute([':bid' => $branch_id]);
    $totalRevenue = $revStmt->fetchColumn() ?: 0;

    $pendStmt = $pdo->prepare("SELECT SUM(p.amount) FROM payments_tb p WHERE $broadCondition AND LOWER(p.payment_status) IN ('pending', 'unpaid', 'partially paid') AND p.subscription_id IS NULL");
    $pendStmt->execute([':bid' => $branch_id]);
    $pendingRevenue = $pendStmt->fetchColumn() ?: 0;

    $apptDateClause = getSqlDateConstraint($period, 'a.start_time');
    $apptCountStmt = $pdo->prepare("SELECT COUNT(*) FROM appointments_tb a WHERE a.branch_id = :bid AND LOWER(a.status) = 'completed' $apptDateClause");
    $apptCountStmt->execute([':bid' => $branch_id]);
    $totalAppts = $apptCountStmt->fetchColumn() ?: 0;

    $resCountStmt = $pdo->prepare("SELECT COUNT(DISTINCT p.order_id) FROM payments_tb p WHERE $strictCondition AND p.payment_type = 'product'");
    $resCountStmt->execute([':bid' => $branch_id]);
    $totalReservations = $resCountStmt->fetchColumn() ?: 0;

    $prodCountStmt = $pdo->prepare("SELECT SUM(oi.quantity) FROM order_items_tb oi JOIN payments_tb p ON oi.order_id = p.order_id WHERE $broadCondition AND oi.product_id IS NOT NULL");
    $prodCountStmt->execute([':bid' => $branch_id]);
    $totalProductUnits = $prodCountStmt->fetchColumn() ?: 0;

    // INVENTORY KPI CALCULATIONS
    $lowStockKpiStmt = $pdo->prepare("SELECT COUNT(*) FROM inventory_tb WHERE branch_id = :bid AND is_active = 1 AND (expiry_date >= CURDATE() OR expiry_date IS NULL) AND stock_level > 0 AND stock_level <= min_stock_level");
    $lowStockKpiStmt->execute([':bid' => $branch_id]);
    $kpiLowStock = $lowStockKpiStmt->fetchColumn() ?: 0;

    $noStockKpiStmt = $pdo->prepare("SELECT COUNT(*) FROM inventory_tb WHERE branch_id = :bid AND is_active = 1 AND (expiry_date >= CURDATE() OR expiry_date IS NULL) AND stock_level <= 0");
    $noStockKpiStmt->execute([':bid' => $branch_id]);
    $kpiNoStock = $noStockKpiStmt->fetchColumn() ?: 0;

    $expiringKpiStmt = $pdo->prepare("SELECT COUNT(*) FROM inventory_tb WHERE branch_id = :bid AND is_active = 1 AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)");
    $expiringKpiStmt->execute([':bid' => $branch_id]);
    $kpiExpiring = $expiringKpiStmt->fetchColumn() ?: 0;

    $expiredKpiStmt = $pdo->prepare("SELECT COUNT(*) FROM inventory_tb WHERE branch_id = :bid AND is_active = 1 AND expiry_date < CURDATE()");
    $expiredKpiStmt->execute([':bid' => $branch_id]);
    $kpiExpired = $expiredKpiStmt->fetchColumn() ?: 0;

    // 4. DATA TABLES
    // SERVICES TABLE
    $svcStmt = $pdo->prepare("SELECT COALESCE(bs.custom_name, 'Unknown Service') as name, COUNT(oi.service_id) as count, SUM(oi.subtotal) as revenue FROM order_items_tb oi JOIN payments_tb p ON oi.order_id = p.order_id LEFT JOIN branch_service_tb bs ON oi.service_id = bs.branch_service_id WHERE $broadCondition AND oi.service_id IS NOT NULL GROUP BY bs.custom_name ORDER BY revenue DESC");
    $svcStmt->execute([':bid' => $branch_id]);
    $svcData = $svcStmt->fetchAll();
    $svcRows = ""; $svcTotalRev = 0; $svcTotalVol = 0;
    foreach ($svcData as $s) {
        $svcTotalRev += $s['revenue']; $svcTotalVol += $s['count'];
        $svcRows .= "<tr><td style='padding:8px; border:1px solid #ddd;'>" . ucwords(strtolower(htmlspecialchars($s['name']))) . "</td><td align='center' style='padding:8px; border:1px solid #ddd;'>{$s['count']}</td><td align='right' style='padding:8px; border:1px solid #ddd;'>PHP " . number_format($s['revenue'], 2) . "</td></tr>";
    }

    // PRODUCT SALES TABLE
    // PRODUCT SALES TABLE
    // PRODUCT SALES TABLE - Sorted by Sales Volume
    $pStmt = $pdo->prepare("
        SELECT 
            pr.name, 
            pr.brand_name,
            pr.brand_type, 
            pr.dosage, 
            pr.category, -- Ensure you select category if you want to use the medication logic
            SUM(oi.quantity) as sales, 
            SUM(oi.subtotal) as revenue 
        FROM order_items_tb oi 
        JOIN payments_tb p ON oi.order_id = p.order_id 
        JOIN products_tb pr ON oi.product_id = pr.product_id 
        WHERE $broadCondition AND oi.product_id IS NOT NULL 
        GROUP BY pr.product_id 
        ORDER BY sales DESC -- Changed from revenue to sales
    ");
    $pStmt->execute([':bid' => $branch_id]);
    $prodData = $pStmt->fetchAll();

    // PRODUCT SALES TABLE
    $prodRows = ""; $prodTotalRev = 0; $prodTotalQty = 0;
    foreach ($prodData as $p) {
        $prodTotalRev += $p['revenue']; 
        $prodTotalQty += $p['sales'];
        
        $name = ucwords(strtolower(htmlspecialchars($p['name'])));
        $brand = !empty($p['brand_name']) ? ucwords(strtolower(htmlspecialchars($p['brand_name']))) : 'Generic';
        
        // 1. Brand Type: ONLY for Medication category
        $showType = (strcasecmp($p['category'] ?? '', 'medication') === 0 && !empty($p['brand_type'])) 
                    ? " &bull; " . ucwords(strtolower($p['brand_type'])) 
                    : "";

        // 2. Dosage/Size: FOR EVERYONE (using the dosage column)
        // Checks if it's empty or contains "N/A"
        $rawMeasurement = trim($p['dosage'] ?? '');
        $hasMeasurement = (!empty($rawMeasurement) && strcasecmp($rawMeasurement, 'n/a') !== 0);
        
        $showMeasurement = $hasMeasurement 
                           ? " &bull; <span style='color: #42756C; font-weight: bold;'>" . strtoupper($rawMeasurement) . "</span>" 
                           : "";

        $prodRows .= "<tr>
            <td style='padding:8px; border:1px solid #ddd;'>
                <div style='font-size:10px; font-weight:bold; color:#1a1a1a;'>$name</div>
                <div style='font-size:7.5px; color:#666; margin-top:2px; text-transform:uppercase;'>
                    {$brand}{$showType}{$showMeasurement}
                </div>
            </td>
            <td align='center' style='padding:8px; border:1px solid #ddd; background-color: #f9f9f9;'>
                " . number_format($p['sales']) . " Units
            </td>
            <td align='right' style='padding:8px; border:1px solid #ddd;'>
                PHP " . number_format($p['revenue'], 2) . "
            </td>
        </tr>";
    }

    // INVENTORY ALERTS TABLE 
    $invStmt = $pdo->prepare("
        SELECT p.name, i.stock_level, i.min_stock_level, i.expiry_date 
        FROM inventory_tb i
        JOIN products_tb p ON i.product_id = p.product_id
        WHERE i.branch_id = :bid AND i.is_active = 1
        AND (i.stock_level <= i.min_stock_level OR i.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY))
        ORDER BY i.stock_level ASC
    ");
    $invStmt->execute([':bid' => $branch_id]);
    $invData = $invStmt->fetchAll();
    $invRows = "";
    foreach ($invData as $row) {
        // First check Expiry
        $isExpired = false; 
        $isExpiring = false;
        if ($row['expiry_date']) {
            $exp = strtotime($row['expiry_date']); 
            $today = strtotime('today'); 
            $soon = strtotime('+30 days');
            if ($exp < $today) $isExpired = true;
            elseif ($exp <= $soon) $isExpiring = true;
        }

        // Logic: If EXPIRED, do NOT show Low/No stock marks
        $showLowStockMark = false;
        $showNoStockMark = false;

        if (!$isExpired) {
            $showNoStockMark = ($row['stock_level'] <= 0);
            $showLowStockMark = ($row['stock_level'] > 0 && $row['stock_level'] <= $row['min_stock_level']);
        }

        $invRows .= "<tr>
            <td style='padding:8px; border:1px solid #ddd;'>" . htmlspecialchars($row['name']) . "</td>
            <td align='center' style='padding:8px; border:1px solid #ddd; color:#92400e; font-weight:bold;'>" . ($showLowStockMark ? '✓' : '') . "</td>
            <td align='center' style='padding:8px; border:1px solid #ddd; color:#b91c1c; font-weight:bold;'>" . ($showNoStockMark ? '✓' : '') . "</td>
            <td align='center' style='padding:8px; border:1px solid #ddd; color:#92400e; font-weight:bold;'>" . ($isExpiring ? '✓' : '') . "</td>
            <td align='center' style='padding:8px; border:1px solid #ddd; color:#b91c1c; font-weight:bold;'>" . ($isExpired ? '✓' : '') . "</td>
        </tr>";
    }
    if (empty($invRows)) $invRows = "<tr><td colspan='5' align='center' style='padding:15px; border:1px solid #ddd; color:#999;'>No critical inventory or expiry alerts.</td></tr>";

    // Logo Processing (omitted for brevity, same as your original)
    $platformLogoHtml = ''; 
    // ... Logo code here ...

    $html = "<html><head><style>
            body { font-family: 'DejaVu Sans', sans-serif; color: #333; margin: 0; padding: 0; font-size: 10px; }
            .container { padding: 30px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
            .branch-name { font-size: 16px; font-weight: bold; color: #42756C; margin-bottom: 5px; }
            .kpi-table { width: 100%; border-spacing: 4px; margin-bottom: 5px; table-layout: fixed; }
            .kpi-card { background: #1a1a1a; color: white; padding: 8px 4px; border-radius: 4px; text-align: center; }
            .kpi-label { font-size: 5.5px; text-transform: uppercase; opacity: 0.8; display: block; }
            .kpi-value { font-size: 8px; font-weight: bold; display: block; margin-top: 3px; }
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
                    <td class='kpi-card' style='width:20%'><span class='kpi-label'>Revenue</span><span class='kpi-value'>PHP ".number_format($totalRevenue, 2)."</span></td>
                    <td class='kpi-card' style='width:20%'><span class='kpi-label'>Pending Revenue</span><span class='kpi-value'>PHP ".number_format($pendingRevenue, 2)."</span></td>
                    <td class='kpi-card' style='width:20%'><span class='kpi-label'>Appointments</span><span class='kpi-value'>".number_format($totalAppts)."</span></td>
                    <td class='kpi-card' style='width:20%'><span class='kpi-label'>Reservations</span><span class='kpi-value'>".number_format($totalReservations)."</span></td>
                    <td class='kpi-card' style='width:20%'><span class='kpi-label'>Prod Units</span><span class='kpi-value'>".number_format($totalProductUnits)."</span></td>
                </tr>
            </table>

            <table class='kpi-table'>
                <tr>
                    <td class='kpi-card' style='background:#92400e; width:25%'><span class='kpi-label'>Low Stock Items</span><span class='kpi-value'>".number_format($kpiLowStock)."</span></td>
                    <td class='kpi-card' style='background:#7f1d1d; width:25%'><span class='kpi-label'>No Stock Items</span><span class='kpi-value'>".number_format($kpiNoStock)."</span></td>
                    <td class='kpi-card' style='background:#92400e; width:25%'><span class='kpi-label'>Expiring Soon</span><span class='kpi-value'>".number_format($kpiExpiring)."</span></td>
                    <td class='kpi-card' style='background:#7f1d1d; width:25%'><span class='kpi-label'>Expired Items</span><span class='kpi-value'>".number_format($kpiExpired)."</span></td>
                </tr>
            </table>

            <div class='section-title'>Top Performing Services</div>
            <table class='data-table'>
                <thead><tr><th>Service Name</th><th align='center'>Volume</th><th align='right'>Total Billings</th></tr></thead>
                <tbody>$svcRows</tbody>
                <tfoot><tr class='total-row'>
                    <td style='padding:8px; border:1px solid #ddd;'>TOTAL</td>
                    <td align='center' style='padding:8px; border:1px solid #ddd;'>$svcTotalVol</td>
                    <td align='right' style='padding:8px; border:1px solid #ddd;'>PHP ".number_format($svcTotalRev, 2)."</td>
                </tr></tfoot>
            </table>

            <div class='section-title'>Top Product Sales</div>
            <table class='data-table'>
                <thead><tr><th>Product Name</th><th align='center'>Units Sold</th><th align='right'>Total Billings</th></tr></thead>
                <tbody>$prodRows</tbody>
                <tfoot><tr class='total-row'>
                    <td style='padding:8px; border:1px solid #ddd;'>TOTAL</td>
                    <td align='center' style='padding:8px; border:1px solid #ddd;'>".number_format($prodTotalQty)." Units</td>
                    <td align='right' style='padding:8px; border:1px solid #ddd;'>PHP ".number_format($prodTotalRev, 2)."</td>
                </tr></tfoot>
            </table>

            <div class='section-title'>Inventory & Expiry Alerts</div>
            <table class='data-table'>
                <thead><tr>
                    <th>Product Name</th>
                    <th align='center' style='width:15%;'>Low Stock</th>
                    <th align='center' style='width:15%;'>No Stock</th>
                    <th align='center' style='width:15%;'>Expiring</th>
                    <th align='center' style='width:15%;'>Expired</th>
                </tr></thead>
                <tbody>$invRows</tbody>
            </table>

            <div style='text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; margin-top: 20px; padding-top: 15px;'>
                <em style='display: block; margin: 8px 0;'>Thank you for trusting {$platformName}!</em>
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
    $dompdf->stream("Branch_Report_{$branch_name}.pdf", ["Attachment" => true]);
} catch (Exception $e) { die("Error: " . $e->getMessage()); }