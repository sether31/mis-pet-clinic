<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

$user = validate_auth(['super_admin']); 

try {
  $pdo = (new Database())->pdo;

  // auto expire the status the subs that is expired by date
  $expireStmt = $pdo->prepare(
    "UPDATE branch_subscriptions_tb 
    SET status = 'expired' 
    WHERE end_date < CURRENT_DATE() AND status = 'active'"
  );
  $expireStmt->execute();

  // get main data
  $stmt = $pdo->prepare(
    "SELECT 
      b.branch_id AS id,
      b.created_at,
      c.name AS clinic_name,
      b.name AS branch_name,
      s.name AS plan_name,
      bs.status,
      bs.end_date AS expiration_date,
      COALESCE((
        SELECT SUM(amount) 
        FROM payments_tb p 
        WHERE p.branch_id = b.branch_id 
        AND p.payment_type = 'subscription' 
        AND p.payment_status = 'paid'
      ), 0) AS amount
    FROM clinic_branches_tb b
    LEFT JOIN clinics_tb c ON b.clinic_id = c.clinic_id
    LEFT JOIN branch_subscriptions_tb bs ON b.branch_id = bs.branch_id
    LEFT JOIN subscription_tb s ON bs.subscription_id = s.subscription_id
    WHERE b.status = 'approved'
    ORDER BY b.created_at DESC"
  );
  $stmt->execute();
  $subscriptions = $stmt->fetchAll();

  // get payment history that is about sub and is apid and group by branch
  $historyStmt = $pdo->prepare(
    "SELECT branch_id, payment_id,      
      updated_at, amount, payment_status as status, created_at as payment_date, payment_method
    FROM payments_tb
    WHERE payment_type = 'subscription' AND payment_status = 'paid'
    ORDER BY created_at DESC"
  );
  $historyStmt->execute();
  $allPayments = $historyStmt->fetchAll();

  $historyByBranch = [];
  foreach($allPayments as $payment) {
    $historyByBranch[$payment['branch_id']][] = $payment;
  }

  // calculate card data
  $totalActive = 0;
  $totalExpired = 0;
  $totalRevenue = 0;

  foreach($subscriptions as &$sub) {
    $status = strtolower($sub['status'] ?? '');
    
    if($status === 'active') {
      $totalActive++;
    } elseif ($status === 'expired') {
      $totalExpired++;
    }
    
    $totalRevenue += (float)$sub['amount'];

    // individual payment sub history
    $sub['history'] = $historyByBranch[$sub['id']] ?? [];
    
    // check if null then unsub
    if(empty($sub['status'])) {
      $sub['status'] = 'Unsubscribed';
    } else {
      $sub['status'] = ucfirst($status);
    }

    // check if plan name is expired then fallback
    if(empty($sub['plan_name'])) {
      $sub['plan_name'] = 'No Plan';
    }
  }

  echo json_encode([
    "success" => true,
    "summary" => [
      "totalActive" => $totalActive,
      "totalExpired" => $totalExpired,
      "totalRevenue" => $totalRevenue
    ],
    "data" => $subscriptions
  ]);

} catch (Exception $e) {
  http_response_code(400);
  echo json_encode([
    "success" => false, 
    "message" => "Failed to fetch subscriptions: " . $e->getMessage()
  ]);
}
?>