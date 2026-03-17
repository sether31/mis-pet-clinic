<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';
require_once __DIR__ . '/../../../../helper/send_notification.php'; 

$user = validate_auth(['branch_admin', 'veterinarian', 'groomer', 'staff']);

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction(); 
  
  $branchId = $user->branch_id;
  $userId = $user->user_id;

  // 1. FETCH STAFF ID & PERMISSIONS
  $stmtPerms = $pdo->prepare("SELECT staff_id, permissions FROM branch_staff_tb WHERE user_id = ? AND branch_id = ? AND status = 1");
  $stmtPerms->execute([$userId, $branchId]);
  $staffRow = $stmtPerms->fetch();
  
  $actualStaffId = $staffRow ? $staffRow['staff_id'] : null;
  $permissions = $staffRow ? json_decode($staffRow['permissions'], true) : [];
  if (!is_array($permissions)) $permissions = [];

  $hasEagleEye = in_array($user->role, ['branch_admin', 'staff']) || in_array('eagle_eye_calendar', $permissions);
  $todayStart = date('Y-m-d 00:00:00');
  $todayEnd   = date('Y-m-d 23:59:59');

  // --- 2. SMART INVENTORY ALERT ENGINE (PINGS) ---
  if (in_array('inventory_management', $permissions) || $user->role === 'branch_admin') {
      
      $stmtInvScan = $pdo->prepare("
          SELECT i.inventory_id, p.name, i.stock_level, i.min_stock_level, i.expiry_date
          FROM inventory_tb i
          JOIN products_tb p ON i.product_id = p.product_id
          WHERE i.branch_id = ? AND i.is_active = 1
            AND (
                i.stock_level <= i.min_stock_level 
                OR i.stock_level = 0 
                OR (i.expiry_date IS NOT NULL AND i.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY))
            )
      ");
      $stmtInvScan->execute([$branchId]);
      $problemItems = $stmtInvScan->fetchAll(PDO::FETCH_ASSOC);

      if (!empty($problemItems)) {
          $stmtRecipients = $pdo->prepare("
              SELECT u.user_id 
              FROM branch_staff_tb bs
              JOIN user_tb u ON bs.user_id = u.user_id
              JOIN roles_tb r ON u.role_id = r.role_id
              WHERE bs.branch_id = ? AND bs.status = 1 
                AND r.role_name IN ('branch_admin', 'staff')
          ");
          $stmtRecipients->execute([$branchId]);
          $recipients = $stmtRecipients->fetchAll(PDO::FETCH_ASSOC);

          $today = new DateTime();
          $today->setTime(0,0);

          foreach ($problemItems as $item) {
              $title = ""; $msg = "";
              $formattedName = ucwords(strtolower($item['name']));
              
              // 👇 ONLY FOR INVENTORY: Format to "March 17, 2026" and strip time
              $cleanExpiry = $item['expiry_date'] ? date('F j, Y', strtotime($item['expiry_date'])) : null;
              
              $today = new DateTime();
              $today->setTime(0,0);
              $expiryDate = $item['expiry_date'] ? new DateTime($item['expiry_date']) : null;
              
              $isExpired = $expiryDate && $expiryDate < $today;
              $isExpiringSoon = $expiryDate && $expiryDate >= $today && $expiryDate <= (new DateTime())->modify('+30 days');

              // 1. OUT OF STOCK
              if ($item['stock_level'] == 0) {
                  $title = "OUT OF STOCK: " . $formattedName;
                  $msg = "{$formattedName} is out of stock. Please restock immediately.";
              } 
              // 2. EXPIRED
              elseif ($isExpired) {
                  $title = "EXPIRED: " . $formattedName;
                  $msg = "{$formattedName} expired on {$cleanExpiry}. Remove from shelves immediately.";
              } 
              // 3. EXPIRING SOON
              elseif ($isExpiringSoon) {
                  $title = "EXPIRING SOON: " . $formattedName;
                  $msg = "{$formattedName} will expire on {$cleanExpiry}. Plan to use or replace this stock.";
              } 
              // 4. LOW STOCK
              else {
                  $title = "Low Stock: " . $formattedName;
                  $msg = "{$formattedName} is low ({$item['stock_level']} left). Restock level is {$item['min_stock_level']}.";
              }

              foreach ($recipients as $recipient) {
                  $targetId = $recipient['user_id'];
                  
                  // Redundancy check (notification_tb singular)
                  $stmtCheck = $pdo->prepare("
                      SELECT COUNT(*) FROM notification_tb 
                      WHERE user_id = ? AND title = ? AND created_at > NOW() - INTERVAL 1 DAY
                  ");
                  $stmtCheck->execute([$targetId, $title]);
                  
                  if ($stmtCheck->fetchColumn() == 0) {
                      send_notification($pdo, $targetId, 'inventory', $title, $msg);
                  }
              }
          }
      }
  }

  // --- 3. FETCH DASHBOARD STATS (Unifying Logic) ---
  $apptCountQuery = "SELECT COUNT(*) FROM appointments_tb WHERE branch_id = ? AND start_time BETWEEN ? AND ? AND status IN ('confirmed', 'completed')";
  if (!$hasEagleEye && $actualStaffId) {
    $apptCountQuery .= " AND staff_id = " . $pdo->quote($actualStaffId);
  }

  // 👇 SYNCED STOCK ALERTS QUERY 👇
  $inventoryAlertQuery = "
    SELECT COUNT(*) FROM inventory_tb 
    WHERE branch_id = ? AND is_active = 1 
    AND (
        stock_level <= min_stock_level 
        OR stock_level = 0 
        OR (expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY))
    )
  ";

  $stmtStats = $pdo->prepare(
    "SELECT 
    ($apptCountQuery) AS today_appointments,
    (SELECT COUNT(DISTINCT pet_id) FROM appointments_tb WHERE branch_id = ?) AS total_patients,
    (SELECT COALESCE(SUM(amount), 0) FROM payments_tb WHERE branch_id = ? AND payment_status = 'paid' AND created_at BETWEEN ? AND ?) AS today_billings,
    ($inventoryAlertQuery) AS stock_alerts,
    (SELECT COUNT(*) FROM order_tb WHERE branch_id = ? AND order_status = 'pending') AS pending_reservations"
  );
  
  $stmtStats->execute([
    $branchId, $todayStart, $todayEnd, 
    $branchId,                         
    $branchId, $todayStart, $todayEnd, 
    $branchId,                         // Param for $inventoryAlertQuery
    $branchId                          
  ]);
  $statsData = $stmtStats->fetch();

  // --- 4. FETCH UPCOMING APPOINTMENTS LIST ---
  $queryAppt = "SELECT a.appointment_id, a.status AS appointment_status, a.start_time, a.end_time, DATE_FORMAT(a.start_time, '%h:%i %p') AS start_time_formatted, DATE_FORMAT(a.end_time, '%h:%i %p') AS end_time_formatted, p.name AS pet_name, p.pet_picture, CONCAT(u.first_name, ' ', u.last_name) AS owner_name, bs.custom_name AS service_type FROM appointments_tb a JOIN pet_tb p ON a.pet_id = p.pet_id JOIN user_tb u ON a.user_id = u.user_id LEFT JOIN branch_service_tb bs ON a.service_id = bs.branch_service_id WHERE a.branch_id = ? AND a.start_time BETWEEN ? AND ? AND a.status IN ('confirmed', 'pending')";

  if ($hasEagleEye) {
      $queryAppt .= " ORDER BY a.start_time ASC LIMIT 8";
      $stmtAppt = $pdo->prepare($queryAppt);
      $stmtAppt->execute([$branchId, $todayStart, $todayEnd]);
  } else {
      $queryAppt .= " AND a.staff_id = ? ORDER BY a.start_time ASC LIMIT 8";
      $stmtAppt = $pdo->prepare($queryAppt);
      $stmtAppt->execute([$branchId, $todayStart, $todayEnd, $actualStaffId]);
  }
  $appointmentsData = $stmtAppt->fetchAll();

  // --- 5. FETCH TOP 3 RESERVATIONS ---
  $upcomingReservations = [];
  if(in_array('shop_management', $permissions)) {
    $stmtRes = $pdo->prepare("SELECT o.order_id, o.order_status as status, o.pickup_date, CONCAT(u.first_name, ' ', u.last_name) as customer_name, (SELECT p.prod_pic FROM order_items_tb oi JOIN products_tb p ON oi.product_id = p.product_id WHERE oi.order_id = o.order_id LIMIT 1) as first_item_pic, (SELECT GROUP_CONCAT(p.name SEPARATOR ', ') FROM order_items_tb oi JOIN products_tb p ON oi.product_id = p.product_id WHERE oi.order_id = o.order_id) as items_summary FROM order_tb o JOIN user_tb u ON o.user_id = u.user_id WHERE o.branch_id = ? AND o.order_status IN ('pending', 'confirmed') ORDER BY o.pickup_date ASC LIMIT 3");
    $stmtRes->execute([$branchId]);
    $upcomingReservations = $stmtRes->fetchAll();
  }

  // --- 6. FETCH WEEKLY TREND ---
  $weekStart = date('Y-m-d 00:00:00', strtotime('monday this week'));
  $weekEnd   = date('Y-m-d 23:59:59', strtotime('sunday this week'));
  $weeklyQuery = "SELECT DATE(start_time) as appt_date, COUNT(*) as daily_count FROM appointments_tb WHERE branch_id = ? AND start_time BETWEEN ? AND ? AND status IN ('confirmed', 'checked_in', 'completed')";
  if (!$hasEagleEye && $actualStaffId) { $weeklyQuery .= " AND staff_id = " . $pdo->quote($actualStaffId); }
  $weeklyQuery .= " GROUP BY DATE(start_time)";
  $stmtWeekly = $pdo->prepare($weeklyQuery);
  $stmtWeekly->execute([$branchId, $weekStart, $weekEnd]);
  $weeklyResults = $stmtWeekly->fetchAll();
  $countsByDate = [];
  foreach($weeklyResults as $row) { $countsByDate[$row['appt_date']] = (int)$row['daily_count']; }
  $weeklyTrend = [];
  $currentDateObj = new DateTime($weekStart);
  $todayDateStr = date('Y-m-d'); 
  for ($i = 0; $i < 7; $i++) {
    $dateStr = $currentDateObj->format('Y-m-d');
    $weeklyTrend[] = [ "day" => $currentDateObj->format('D'), "appointments" => $countsByDate[$dateStr] ?? 0, "isToday" => ($dateStr === $todayDateStr) ];
    $currentDateObj->modify('+1 day');
  }

  // --- 7. MAINTENANCE STATUS ---
  $stmtBranch = $pdo->prepare("SELECT is_maintenance FROM clinic_branches_tb WHERE branch_id = ?");
  $stmtBranch->execute([$branchId]);
  $isMaintenance = (int)($stmtBranch->fetchColumn() ?: 0);

  $pdo->commit();

  echo json_encode([
    "success" => true,
    "data" => [
      "is_maintenance" => $isMaintenance, 
      "stats" => [
        "today_appointments" => (int)$statsData['today_appointments'],
        "total_patients" => (int)$statsData['total_patients'],
        "today_billings" => (float)$statsData['today_billings'],
        "stock_alerts" => (int)$statsData['stock_alerts'],
        "pending_reservations" => (int)$statsData['pending_reservations']
      ],
      "appointments" => $appointmentsData,
      "upcoming_reservations" => $upcomingReservations, 
      "weekly_trend" => $weeklyTrend
    ]
  ]);

} catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>