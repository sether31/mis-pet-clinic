<?php
require_once '../../../../config/Database.php';
require_once '../../../../middleware/auth-middleware.php';
require_once '../../../../helper/send_notification.php'; 

$user = validate_auth(['clinic_admin']); 
$user_id = $user->user_id;

try {
  $pdo = (new Database())->pdo;

  // Fetch the clinic_id since it is not in the JWT token
  $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinics_tb WHERE created_by = ? LIMIT 1");
  $stmtClinic->execute([$user_id]);
  $clinic_id = $stmtClinic->fetchColumn();

  if (!$clinic_id) {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "No clinic found for this admin."]);
    exit;
  }

  // 1. Find branches expiring in exactly 7 days
  $stmtWarning = $pdo->prepare(
    "SELECT cb.name as branch_name, bs.end_date 
      FROM branch_subscriptions_tb bs
      JOIN clinic_branches_tb cb ON bs.branch_id = cb.branch_id
      WHERE cb.clinic_id = :clinic_id 
        AND bs.status = 'active'
        AND bs.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)"
  );
  $stmtWarning->execute([':clinic_id' => $clinic_id]);
  $warnings = $stmtWarning->fetchAll();

  // 2. Find branches that are currently expired
  $stmtExpired = $pdo->prepare(
    "SELECT cb.name as branch_name, bs.end_date 
    FROM branch_subscriptions_tb bs
    JOIN clinic_branches_tb cb ON bs.branch_id = cb.branch_id
    WHERE cb.clinic_id = :clinic_id 
      AND bs.status = 'active'
      -- it doesn't expire until the day AFTER the end date
      AND bs.end_date < CURDATE()" 
  );
  $stmtExpired->execute([':clinic_id' => $clinic_id]);
  $expired = $stmtExpired->fetchAll();

  // 3. Spam-prevention check
  $checkNotif = $pdo->prepare("SELECT COUNT(*) FROM notification_tb WHERE user_id = ? AND title = ? AND message = ?");

  // Process 7-Day Warnings
  foreach ($warnings as $w) {
    $formatted_date = date('F j, Y', strtotime($w['end_date'])); 

    $title = "Expiring Soon: " . $w['branch_name']; 
    $message = "Your subscription for " . $w['branch_name'] . " expires on " . $formatted_date . ". Renew soon to avoid losing access to platform features.";
    $category = "subscription_warn";
    
    $checkNotif->execute([$user_id, $title, $message]);
    if ($checkNotif->fetchColumn() == 0) {
      send_notification($pdo, $user_id, $category, $title, $message);
    }
  }

  // Process Expired Alerts
  foreach ($expired as $e) {
    $formatted_date = date('F j, Y', strtotime($e['end_date']));

    $title = "Subscription Expired: " . $e['branch_name'];
    $message = "Your subscription for " . $e['branch_name'] . " expired on " . $formatted_date . ". Shop and booking features are now locked.";
    $category = "subscription_expired"; // Matches the Amber/Red badge in your frontend
    
    $checkNotif->execute([$user_id, $title, $message]);
    if ($checkNotif->fetchColumn() == 0) {
      send_notification($pdo, $user_id, $category, $title, $message);
    }
  }

  echo json_encode(["success" => true, "message" => "Subscription checks completed."]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>