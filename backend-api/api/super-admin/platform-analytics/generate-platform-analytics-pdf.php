<?php
require_once __DIR__ . '/../../../vendor/autoload.php'; 
require_once __DIR__ . '/../../../config/Database.php';

use Dompdf\Dompdf;
use Dompdf\Options;

$user_id = $_GET['user_id'] ?? null; 
$period = $_GET['period'] ?? 'month';

if (!$user_id) {
  die("Unauthorized: User ID is required.");
}

function getSqlDateConstraint($period, $column) {
  switch ($period) {
      case 'week': return "YEARWEEK($column, 1) = YEARWEEK(CURDATE(), 1)";
      case 'month': return "MONTH($column) = MONTH(CURDATE()) AND YEAR($column) = YEAR(CURDATE())";
      case 'year': return "YEAR($column) = YEAR(CURDATE())";
      case 'all': return "1=1";
      case 'today':
      default: return "DATE($column) = CURDATE()";
  }
}

try {
  $database = new Database();
  $pdo = $database->pdo;

  // 1. PLATFORM DETAILS
  $platformStmt = $pdo->query("SELECT platform_name, platform_logo FROM platform_settings_tb LIMIT 1");
  $platform = $platformStmt->fetch();
  $platformName = ucwords(strtolower($platform['platform_name'] ?? 'Clinic Platform'));

  // 2. DATE CONSTRAINTS
  $dateClauseP = getSqlDateConstraint($period, "p.created_at");

  // KPI FETCHING
  $totalClinics = (int)$pdo->query("SELECT COUNT(*) FROM clinics_tb")->fetchColumn();
  $activeSubs = (int)$pdo->query("SELECT COUNT(DISTINCT branch_id) FROM branch_subscriptions_tb WHERE LOWER(status) = 'active' AND end_date >= CURDATE()")->fetchColumn();
  $pendingApps = (int)$pdo->query("SELECT COUNT(*) FROM clinic_branches_tb WHERE LOWER(status) = 'pending'")->fetchColumn();

  $platformRevStmt = $pdo->query("SELECT COALESCE(SUM(amount), 0) FROM payments_tb p WHERE subscription_id IS NOT NULL AND LOWER(p.payment_status) = 'paid' AND $dateClauseP");
  $platformRevenue = (float)$platformRevStmt->fetchColumn();

  // 3. TOP SUBSCRIPTIONS + TOTALS
  $stmtTopSubs = $pdo->query("SELECT s.name, COUNT(p.payment_id) as total_sold, SUM(p.amount) as total_revenue FROM payments_tb p JOIN subscription_tb s ON p.subscription_id = s.subscription_id WHERE LOWER(p.payment_status) = 'paid' AND p.subscription_id IS NOT NULL AND $dateClauseP GROUP BY s.subscription_id ORDER BY total_revenue DESC LIMIT 5");
  $topSubsHtml = ""; $sumSubSold = 0; $sumSubRev = 0;
  foreach ($stmtTopSubs->fetchAll() as $s) {
      $sumSubSold += $s['total_sold']; $sumSubRev += $s['total_revenue'];
      $topSubsHtml .= "<tr><td>" . ucwords(strtolower(htmlspecialchars($s['name']))) . "</td><td align='right'>{$s['total_sold']} Sold</td><td align='right'>PHP " . number_format($s['total_revenue'], 2) . "</td></tr>";
  }

  // 4. TOP REGIONS + TOTALS
  $stmtTopRegions = $pdo->query("SELECT b.province as name, COUNT(DISTINCT b.branch_id) as branch_count, SUM(p.amount) as total_revenue FROM payments_tb p JOIN clinic_branches_tb b ON p.branch_id = b.branch_id WHERE p.subscription_id IS NOT NULL AND LOWER(p.payment_status) = 'paid' AND $dateClauseP GROUP BY b.province ORDER BY total_revenue DESC LIMIT 5");
  $topRegionsHtml = ""; $sumRegBranch = 0; $sumRegRev = 0;
  foreach ($stmtTopRegions->fetchAll() as $r) {
      $sumRegBranch += $r['branch_count']; $sumRegRev += $r['total_revenue'];
      $topRegionsHtml .= "<tr><td>" . ucwords(strtolower(htmlspecialchars($r['name']))) . "</td><td align='right'>{$r['branch_count']} Branches</td><td align='right'>PHP " . number_format($r['total_revenue'], 2) . "</td></tr>";
  }

  // 5. BRANCH PERFORMANCE + TOTALS
  $stmtBranches = $pdo->query("SELECT b.branch_id, b.name as branch_name, bs.status as subscription_status, (SELECT COALESCE(SUM(amount), 0) FROM payments_tb p2 WHERE p2.branch_id = b.branch_id AND p2.subscription_id IS NULL AND LOWER(p2.payment_status) = 'paid' AND " . getSqlDateConstraint($period, "p2.created_at") . ") as branch_revenue FROM clinic_branches_tb b LEFT JOIN branch_subscriptions_tb bs ON b.branch_id = bs.branch_id WHERE LOWER(b.status) = 'approved' ORDER BY branch_revenue DESC LIMIT 20");
  $branchRowsHtml = ""; $sumBranchRev = 0;
  foreach ($stmtBranches->fetchAll() as $b) {
      $sumBranchRev += $b['branch_revenue'];
      $sub_status = ucwords(strtolower($b['subscription_status'] ?? 'None'));
      $branchRowsHtml .= "<tr><td align='center'>{$b['branch_id']}</td><td>" . ucwords(strtolower(htmlspecialchars($b['branch_name']))) . "</td><td align='center'>$sub_status</td><td align='right'>PHP " . number_format($b['branch_revenue'], 2) . "</td></tr>";
  }

  // LOGO
  $platformLogoHtml = '';
  if (!empty($platform['platform_logo'])) {
      $pLogoPath = __DIR__ . '/../../../' . $platform['platform_logo']; 
      if(file_exists($pLogoPath)) {
          $pType = pathinfo($pLogoPath, PATHINFO_EXTENSION);
          $pBase64 = 'data:image/' . $pType . ';base64,' . base64_encode(file_get_contents($pLogoPath));
          $platformLogoHtml = "<img src='{$pBase64}' style='height: 12px; vertical-align: middle; margin-right: 4px;' />";
      }
  }

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
          .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; font-size: 8px; }
          .data-table th { background: #fafafa; text-transform: uppercase; text-align: left; }
          .total-row { background: #eee; font-weight: bold; }
      </style></head><body>
      <div class='container'>
          <div class='header'>
              <h2 style='margin:0; color: #42756C;'>$platformName</h2>
              <h3 style='margin:0;'>PLATFORM ANALYTICS REPORT</h3>
              <p style='font-size:8px; color:#666;'>PERIOD: " . strtoupper($period) . " | GENERATED: " . date("F d, Y") . "</p>
          </div>
          <table class='kpi-grid'>
              <tr>
                  <td class='kpi-card'><span class='kpi-label'>Platform Revenue</span><span class='kpi-value'>PHP " . number_format($platformRevenue, 2) . "</span></td>
                  <td class='kpi-card'><span class='kpi-label'>Active Subscriptions</span><span class='kpi-value'>" . number_format($activeSubs) . "</span></td>
                  <td class='kpi-card'><span class='kpi-label'>Total Clinics</span><span class='kpi-value'>" . number_format($totalClinics) . "</span></td>
                  <td class='kpi-card'><span class='kpi-label'>Pending Applications</span><span class='kpi-value'>" . number_format($pendingApps) . "</span></td>
              </tr>
          </table>

          <div class='section-title'>Top Performing Subscriptions</div>
          <table class='data-table'>
              <thead><tr><th>Subscription Plan</th><th align='right'>Volume</th><th align='right'>Total Billings</th></tr></thead>
              <tbody>$topSubsHtml</tbody>
              <tfoot><tr class='total-row'><td>TOTAL</td><td align='right'>$sumSubSold Sold</td><td align='right'>PHP " . number_format($sumSubRev, 2) . "</td></tr></tfoot>
          </table>

          <div class='section-title'>Top Performing Regions</div>
          <table class='data-table'>
              <thead><tr><th>Region / Province</th><th align='right'>Active Branches</th><th align='right'>Total Billings</th></tr></thead>
              <tbody>$topRegionsHtml</tbody>
              <tfoot><tr class='total-row'><td>TOTAL</td><td align='right'>$sumRegBranch Branches</td><td align='right'>PHP " . number_format($sumRegRev, 2) . "</td></tr></tfoot>
          </table>

          <div class='section-title'>Top 20 Clinics by Patient Revenue</div>
          <table class='data-table'>
              <thead><tr><th align='center'>ID</th><th>Branch Name</th><th align='center'>Sub Status</th><th align='right'>Clinic Revenue</th></tr></thead>
              <tbody>$branchRowsHtml</tbody>
              <tfoot><tr class='total-row'><td colspan='3' align='center'>COMBINED REVENUE (TOP 20)</td><td align='right'>PHP " . number_format($sumBranchRev, 2) . "</td></tr></tfoot>
          </table>

          <div style='text-align: center; font-size: 9px; color: #999; margin-top: 20px; padding-top: 15px;'>
              <em style='display: block; margin: 8px 0;'>Confidential Platform Data - For Internal Use Only</em>
              <div style='margin-top: 5px; font-size: 8px; color: #bbb;'>Powered by {$platformLogoHtml} <strong>{$platformName}</strong></div>
          </div>
      </div></body></html>";

  $dompdf = new Dompdf(['isHtml5ParserEnabled' => true, 'isRemoteEnabled' => true]);
  $dompdf->loadHtml($html, 'UTF-8');
  $dompdf->setPaper('A4', 'portrait');
  $dompdf->render();
  if (ob_get_length()) ob_end_clean();
  $dompdf->stream("Platform_Analytics_" . date("Ymd") . ".pdf", ["Attachment" => true]);
} catch (Exception $e) { die("Error: " . $e->getMessage()); }