<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

require_once '../config/Database.php';
require_once '../helper/send_notification.php'; 

$cron_key = $_ENV['CRON_SECURE_KEY'] ?? getenv('CRON_SECURE_KEY');
$is_cron = isset($_GET['key']) && $_GET['key'] === $cron_key;

if (!isset($_GET['key']) || $_GET['key'] !== $cron_key) {
  http_response_code(403);
  echo json_encode(["success" => false, "message" => "Unauthorized access."]);
  exit;
}

try {
  $pdo = (new Database())->pdo;

  // 1. Fetch all expiring/expired branches + their Clinic Admin
  $stmt = $pdo->prepare("
      SELECT 
          cb.branch_id,
          cb.name as branch_name, 
          bs.end_date, 
          c.name as clinic_name,   -- Fixed: changed c.clinic_name to c.name
          c.created_by as clinic_admin_id
      FROM branch_subscriptions_tb bs
      JOIN clinic_branches_tb cb ON bs.branch_id = cb.branch_id
      JOIN clinics_tb c ON cb.clinic_id = c.clinic_id
      WHERE bs.status = 'active'
      AND (bs.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) 
        OR bs.end_date < CURDATE())
  ");
  $stmt->execute();
  $expirations = $stmt->fetchAll();

  foreach ($expirations as $item) {
      $isExpired = strtotime($item['end_date']) < time();
      $dateStr = date('F j, Y', strtotime($item['end_date']));
      
      // Define Content
      $category = $isExpired ? "subscription_expired" : "subscription_warn";
      $title = ($isExpired ? "Expired: " : "Expiring Soon: ") . $item['branch_name'];
      $message = "Subscription for {$item['branch_name']} " . ($isExpired ? "expired on $dateStr." : "expires on $dateStr.");

      // --- A. NOTIFY SUPER ADMIN ---
      $saMsg = "[{$item['clinic_name']}] " . $message;
      send_unique_notif($pdo, $superAdminId, $category, $title, $saMsg);

      // --- B. NOTIFY CLINIC ADMIN ---
      send_unique_notif($pdo, $item['clinic_admin_id'], $category, $title, $message);

      // --- C. NOTIFY BRANCH ADMIN(S) ---
      // Find all users with role 'branch_admin' assigned to THIS branch
      $stmtBA = $pdo->prepare("
          SELECT u.user_id 
          FROM user_tb u
          JOIN branch_staff_tb bs_staff ON u.user_id = bs_staff.user_id
          WHERE bs_staff.branch_id = ? 
            AND bs_staff.status = 1
            AND u.role_id = 3
      ");
      $stmtBA->execute([$item['branch_id']]);
      $branchAdmins = $stmtBA->fetchAll(PDO::FETCH_COLUMN);

      // If this specific branch has active admins, notify them.
      // If not (like your User 114 with status 0), this loop simply won't run,
      // but the script will continue to the next branch in the main loop!
      if ($branchAdmins) {
          foreach ($branchAdmins as $baId) {
              send_unique_notif($pdo, $baId, $category, $title, $message);
          }
      }

  }

  echo json_encode(["success" => true, "message" => "Global notifications synced."]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}

/**
 * The Secret Sauce: Prevents duplicate notifications per user.
 * Isolated to only allow 30-day resets for subscription categories.
 */
function send_unique_notif($pdo, $userId, $cat, $title, $msg) {
    // 1. Start with the basic check (user and title)
    $query = "SELECT COUNT(*) FROM notification_tb WHERE user_id = ? AND title = ?";

    // 2. ONLY for subscriptions: Allow it to resend if the old one is more than 30 days old.
    // This ensures that next year, a notification with the same title will send again.
    if ($cat === 'subscription_expired' || $cat === 'subscription_warn') {
        $query .= " AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)";
    }

    $check = $pdo->prepare($query);
    $check->execute([$userId, $title]);
    
    if ($check->fetchColumn() == 0) {
        send_notification($pdo, $userId, $cat, $title, $msg);
    }
}