<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../middleware/auth-middleware.php';

// Ensure only super admins can access
$admin = validate_auth(['super_admin']);
$userId = $admin->user_id; // Extract ID from the decoded token

try {
  $pdo = (new Database())->pdo;
  $filter = $_GET['filter'] ?? 'month';

  // 1. Date Condition Logic
  $field = "p.created_at"; 
  $dateCondition = "1=1"; 
  switch ($filter) {
    case 'today': $dateCondition = "DATE($field) = CURDATE()"; break;
    case 'week':  $dateCondition = "YEARWEEK($field, 1) = YEARWEEK(CURDATE(), 1)"; break;
    case 'month': $dateCondition = "MONTH($field) = MONTH(CURDATE()) AND YEAR($field) = YEAR(CURDATE())"; break;
    case 'year':  $dateCondition = "YEAR($field) = YEAR(CURDATE())"; break;
  }

  // 2. Stats Calculations
  $totalApproved = $pdo->query("SELECT COUNT(*) FROM clinic_branches_tb WHERE status = 'approved'")->fetchColumn();
  $pendingApps = $pdo->query("SELECT COUNT(*) FROM clinic_branches_tb WHERE status = 'pending'")->fetchColumn();
  $totalSubscribed = $pdo->query("SELECT COUNT(DISTINCT branch_id) FROM branch_subscriptions_tb")->fetchColumn();
  $totalActive = $pdo->query("SELECT COUNT(DISTINCT branch_id) FROM branch_subscriptions_tb WHERE end_date >= CURDATE() AND status = 'active'")->fetchColumn();
  
  $stmtRev = $pdo->prepare("
    SELECT SUM(amount) 
    FROM payments_tb p 
    WHERE p.payment_status = 'paid' 
    AND p.payment_type = 'subscription' 
    AND $dateCondition
  ");
  $stmtRev->execute();
  $platformRevenue = $stmtRev->fetchColumn() ?? 0;

  // 3. Pending Applications (Top 10)
  $stmtApps = $pdo->query("SELECT branch_id, name, municipality, province, logo_picture, status, created_at FROM clinic_branches_tb WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10");
  $applications = $stmtApps->fetchAll();

  // 4. REAL Notifications Overview (Limited to 10)
  $stmtNotes = $pdo->prepare("
    SELECT notification_id, category as type, title, message, is_read, created_at 
    FROM notification_tb 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 10
  ");
  $stmtNotes->execute([$userId]);
  $rawNotes = $stmtNotes->fetchAll();
  
  $notifications = array_map(function($n) {
      $n['time_ago'] = time_elapsed_string($n['created_at']);
      $n['isRead'] = $n['is_read'] == 1; 
      return $n;
  }, $rawNotes);

  // 5. Top Clinic Earners (Filtered: Must have at least one subscription record)
  $stmtTop = $pdo->prepare("
    SELECT 
      b.branch_id, 
      b.name, 
      (SELECT COALESCE(SUM(p.amount), 0) 
        FROM payments_tb p 
        WHERE p.branch_id = b.branch_id 
        AND p.payment_status = 'paid' 
        AND p.payment_type IN ('product', 'appointment') 
        AND $dateCondition) as revenue
    FROM clinic_branches_tb b
    WHERE b.status = 'approved'
    -- ONLY show branches that exist in the subscriptions table
    AND EXISTS (
      SELECT 1 FROM branch_subscriptions_tb bs 
      WHERE bs.branch_id = b.branch_id
    )
    ORDER BY revenue DESC
    LIMIT 10
  ");
  $stmtTop->execute();
  $topEarners = $stmtTop->fetchAll();

  echo json_encode([
    "success" => true,
    "data" => [
      "stats" => [
        "total_approved_clinics" => (int)$totalApproved,
        "pending_applications" => (int)$pendingApps,
        "total_subscribed_clinics" => (int)$totalSubscribed,
        "total_active_subscribed_clinics" => (int)$totalActive,
        "platform_revenue" => (float)$platformRevenue
      ],
      "applications" => $applications,
      "notifications" => $notifications,
      "topEarners" => $topEarners
    ]
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}

// Time helper function
function time_elapsed_string($datetime, $full = false) {
    $now = new DateTime;
    $ago = new DateTime($datetime);
    $diff = $now->diff($ago);

    // Calculate weeks manually since $w isn't a native property in DateInterval
    $diff->w = floor($diff->d / 7);
    $diff->d -= $diff->w * 7;

    $string = [
        'y' => 'year',
        'm' => 'month',
        'w' => 'week',
        'd' => 'day',
        'h' => 'hour',
        'i' => 'minute',
        's' => 'second',
    ];
    foreach ($string as $k => &$v) {
        if ($diff->$k) {
            $v = $diff->$k . ' ' . $v . ($diff->$k > 1 ? 's' : '');
        } else {
            unset($string[$k]);
        }
    }

    if (!$full) $string = array_slice($string, 0, 1);
    return $string ? implode(', ', $string) . ' ago' : 'just now';
}