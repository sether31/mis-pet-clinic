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

  // Date Constraint Logic
  function getSqlDateConstraint($period, $alias = '') {
    $col = $alias ? "$alias.created_at" : "created_at";
    switch ($period) {
        case 'today': return "AND DATE($col) = CURDATE()";
        case 'month': 
            // This filters for ONLY the current calendar month
            return "AND MONTH($col) = MONTH(CURDATE()) AND YEAR($col) = YEAR(CURDATE())";
        case 'year':  return "AND YEAR($col) = YEAR(CURDATE())"; 
        case 'week':
        default:      return "AND $col >= DATE_SUB(NOW(), INTERVAL 6 DAY)";
    }
}

  $dateClause = getSqlDateConstraint($period);
  $dateClauseAliasO = getSqlDateConstraint($period, 'o');
  $dateClauseAliasP = getSqlDateConstraint($period, 'p'); // Added for payments_tb alias

  // 1. KPI CARD DATA (Locks to Payment created_at - fixes the March 20/21 issue)
  $revStmt = $pdo->prepare("
      SELECT COALESCE(SUM(amount), 0) 
      FROM payments_tb 
      WHERE branch_id = :bid 
      AND LOWER(payment_status) IN ('paid', 'completed', 'success')
      AND subscription_id IS NULL
      $dateClause 
  ");
  $revStmt->execute([':bid' => $branch_id]);
  $revenue = $revStmt->fetchColumn();

  $prodCountStmt = $pdo->prepare("SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items_tb oi JOIN order_tb o ON oi.order_id = o.order_id WHERE o.branch_id = :bid AND oi.product_id IS NOT NULL AND LOWER(o.order_status) IN ('completed', 'paid') $dateClauseAliasO");
  $prodCountStmt->execute([':bid' => $branch_id]);
  $productsSold = $prodCountStmt->fetchColumn();

  $apptStmt = $pdo->prepare("
      SELECT COUNT(*) 
      FROM appointments_tb 
      WHERE branch_id = :bid 
      AND status IN ('confirmed', 'completed') 
      $dateClause
  ");
  $apptStmt->execute([':bid' => $branch_id]);
  $appointments = $apptStmt->fetchColumn();

  // 2. REVENUE TREND (Line Chart - strictly uses payment created_at)
  $revenueTrend = [];

  if ($period === 'year') {
      $months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      $trendStmt = $pdo->prepare("
          SELECT MONTH(created_at) as m, SUM(amount) as total 
          FROM payments_tb 
          WHERE branch_id = :bid 
          AND YEAR(created_at) = YEAR(CURDATE()) 
          AND LOWER(payment_status) IN ('paid', 'completed', 'success') 
          AND subscription_id IS NULL
          GROUP BY m
      ");
      $trendStmt->execute([':bid' => $branch_id]);
      $results = $trendStmt->fetchAll(PDO::FETCH_KEY_PAIR);

      foreach ($months as $index => $name) {
          $revenueTrend[] = ["name" => $name, "revenue" => (float)($results[$index + 1] ?? 0)];
      }
  } elseif ($period === 'week' || $period === 'month') {
    if ($period === 'week') {
        $daysToLookBack = 6;
        $startDate = strtotime("-6 days");
        $endDate = strtotime("today");
    } else {
        // Start from the 1st day of the current month
        $startDate = strtotime(date('Y-m-01'));
        $endDate = strtotime("today");
        // Calculate difference in days to know how many iterations we need
        $daysToLookBack = (int)date('j') - 1; 
    }
    
    // Loop from the Start Date forward to Today
    for ($i = 0; $i <= $daysToLookBack; $i++) {
        $currentTimestamp = strtotime("+$i days", $startDate);
        $label = ($period === 'week') ? date('D', $currentTimestamp) : date('M d', $currentTimestamp); 
        $sqlDate = date('Y-m-d', $currentTimestamp);
        
        $trendStmt = $pdo->prepare("
            SELECT SUM(amount) 
            FROM payments_tb 
            WHERE branch_id = :bid 
            AND DATE(created_at) = :d 
            AND LOWER(payment_status) IN ('paid', 'completed', 'success')
            AND subscription_id IS NULL
        ");
        $trendStmt->execute([':bid' => $branch_id, ':d' => $sqlDate]);
        $val = $trendStmt->fetchColumn();
        
        $revenueTrend[] = ["name" => $label, "revenue" => (float)($val ?? 0)];
    }
} else {
      $trendStmt = $pdo->prepare("
          SELECT DATE_FORMAT(created_at, '%h %p') as name, SUM(amount) as revenue 
          FROM payments_tb 
          WHERE branch_id = :bid 
          AND DATE(created_at) = CURDATE() 
          AND LOWER(payment_status) IN ('paid', 'completed', 'success') 
          AND subscription_id IS NULL
          GROUP BY name 
          ORDER BY created_at ASC
      ");
      $trendStmt->execute([':bid' => $branch_id]);
      $revenueTrend = $trendStmt->fetchAll(PDO::FETCH_ASSOC);
  }

  // 3. TOP SERVICES
  $svcStmt = $pdo->prepare("SELECT bs.custom_name as name, COUNT(oi.order_item_id) as count FROM order_items_tb oi JOIN branch_service_tb bs ON oi.service_id = bs.branch_service_id JOIN order_tb o ON oi.order_id = o.order_id WHERE o.branch_id = :bid AND oi.service_id IS NOT NULL $dateClauseAliasO GROUP BY bs.branch_service_id ORDER BY count DESC LIMIT 5");
  $svcStmt->execute([':bid' => $branch_id]);
  $topServices = $svcStmt->fetchAll(PDO::FETCH_ASSOC);

  // 4. TOP PRODUCTS
  $pStmt = $pdo->prepare("SELECT pr.name, SUM(oi.quantity) as sales FROM order_items_tb oi JOIN products_tb pr ON oi.product_id = pr.product_id JOIN order_tb o ON oi.order_id = o.order_id WHERE o.branch_id = :bid AND LOWER(o.order_status) IN ('completed', 'paid') $dateClauseAliasO GROUP BY pr.product_id ORDER BY sales DESC LIMIT 5");
  $pStmt->execute([':bid' => $branch_id]);
  $topProducts = $pStmt->fetchAll(PDO::FETCH_ASSOC);

  // 5. REVENUE BREAKDOWN (Pie Chart) - The Final Fix!
  $breakdownStmt = $pdo->prepare("
        SELECT 
            CASE WHEN o.pickup_date IS NULL THEN 'Services' ELSE 'Products' END as category, 
            SUM(p.amount) as value 
        FROM payments_tb p
        JOIN order_tb o ON p.order_id = o.order_id
        WHERE p.branch_id = :bid 
        AND LOWER(p.payment_status) IN ('paid', 'completed', 'success')
        AND p.subscription_id IS NULL
        $dateClauseAliasP
        GROUP BY category
    ");
    $breakdownStmt->execute([':bid' => $branch_id]);
    $revenueBreakdown = $breakdownStmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
      "success" => true,
      "data" => [
          "cardData" => ["revenue" => (float)$revenue, "productsSold" => (int)$productsSold, "appointments" => (int)$appointments],
          "revenueTrend" => $revenueTrend,
          "topServices" => $topServices,
          "topProducts" => $topProducts,
          "revenueBreakdown" => $revenueBreakdown
      ]
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}