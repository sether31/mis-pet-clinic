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

  // --- 1. FETCH STAFF ID & PERMISSIONS ---
  $stmtPerms = $pdo->prepare("SELECT staff_id, permissions FROM branch_staff_tb WHERE user_id = ? AND branch_id = ? AND status = 1");
  $stmtPerms->execute([$userId, $branchId]);
  $staffRow = $stmtPerms->fetch();
  
  $actualStaffId = $staffRow ? $staffRow['staff_id'] : null;
  $permissions = $staffRow ? json_decode($staffRow['permissions'], true) : [];
  if (!is_array($permissions)) $permissions = [];

  $hasEagleEye = in_array($user->role, ['branch_admin', 'staff']) || in_array('eagle_eye_calendar', $permissions);
  
  $todayStart = date('Y-m-d 00:00:00');
  $todayEnd   = date('Y-m-d 23:59:59');

  $staffFilter = (!$hasEagleEye && $actualStaffId) ? " AND staff_id = " . $pdo->quote($actualStaffId) : "";

  // --- 2. INVENTORY ALERTS (Branch-wide) ---
  $inventoryAlertQuery = "SELECT COUNT(*) FROM inventory_tb WHERE branch_id = ? AND is_active = 1 AND (stock_level <= min_stock_level OR stock_level = 0 OR (expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)))";

  // --- 3. FETCH DASHBOARD STATS ---
  
  // Today's Appointments Count
  $apptCountQuery = "SELECT COUNT(*) FROM appointments_tb WHERE branch_id = ? AND start_time BETWEEN ? AND ? AND status IN ('confirmed', 'completed') $staffFilter";

  // Total UNIQUE Patients treated (COMPLETED) by this staff/branch
  $totalPatientsQuery = "SELECT COUNT(DISTINCT pet_id) FROM appointments_tb WHERE branch_id = ? AND status = 'completed' $staffFilter";

  // Today's Billings (Revenue from Paid orders linked to this staff's appointments)
  $todayBillingsQuery = "SELECT COALESCE(SUM(p.amount), 0) 
                          FROM payments_tb p 
                          INNER JOIN order_tb o ON p.order_id = o.order_id 
                          INNER JOIN appointments_tb a ON o.order_id = a.order_id 
                          WHERE p.branch_id = ? AND p.payment_status = 'paid' 
                          AND p.created_at BETWEEN ? AND ? $staffFilter";

  // FIXED: Count ALL active product reservations (pickup_date exists) that aren't finished yet.
  // This ignores the 'today' time filter so you see the total backlog.
  $pendingReservationsQuery = "SELECT COUNT(*) FROM order_tb 
                                WHERE branch_id = ? 
                                AND pickup_date IS NOT NULL 
                                AND order_status IN ('pending', 'confirmed', 'to_pickup')";

  $stmtStats = $pdo->prepare("
      SELECT 
          ($apptCountQuery) AS today_appointments,
          ($totalPatientsQuery) AS total_patients,
          ($todayBillingsQuery) AS today_billings,
          ($inventoryAlertQuery) AS stock_alerts,
          ($pendingReservationsQuery) AS pending_reservations"
  );
  
  $stmtStats->execute([
      $branchId, $todayStart, $todayEnd, // today_appointments
      $branchId,                         // total_patients
      $branchId, $todayStart, $todayEnd, // today_billings
      $branchId,                         // stock_alerts
      $branchId                          // pending_reservations
  ]);
  $statsData = $stmtStats->fetch();

  // --- 4. UPCOMING APPOINTMENTS LIST ---
  $queryAppt = "SELECT a.appointment_id, a.status AS appointment_status, a.start_time, a.end_time, 
                DATE_FORMAT(a.start_time, '%h:%i %p') AS start_time_formatted, 
                p.name AS pet_name, p.pet_picture, 
                CONCAT(u.first_name, ' ', u.last_name) AS owner_name, 
                bs.custom_name AS service_type 
                FROM appointments_tb a 
                JOIN pet_tb p ON a.pet_id = p.pet_id 
                JOIN user_tb u ON a.user_id = u.user_id 
                LEFT JOIN branch_service_tb bs ON a.service_id = bs.branch_service_id 
                WHERE a.branch_id = ? AND a.start_time BETWEEN ? AND ? 
                AND a.status IN ('confirmed', 'pending')";

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

  // --- 5. RESERVATIONS (TOP 3) ---
  $upcomingReservations = [];
  if(in_array('shop_management', $permissions) || $hasEagleEye) {
      $stmtRes = $pdo->prepare("SELECT o.order_id, o.order_status as status, o.pickup_date, CONCAT(u.first_name, ' ', u.last_name) as customer_name, (SELECT p.prod_pic FROM order_items_tb oi JOIN products_tb p ON oi.product_id = p.product_id WHERE oi.order_id = o.order_id LIMIT 1) as first_item_pic, (SELECT GROUP_CONCAT(p.name SEPARATOR ', ') FROM order_items_tb oi JOIN products_tb p ON oi.product_id = p.product_id WHERE oi.order_id = o.order_id) as items_summary FROM order_tb o JOIN user_tb u ON o.user_id = u.user_id WHERE o.branch_id = ? AND o.order_status IN ('pending', 'confirmed') AND o.pickup_date IS NOT NULL ORDER BY o.pickup_date ASC LIMIT 3");
      $stmtRes->execute([$branchId]);
      $upcomingReservations = $stmtRes->fetchAll();
  }

  // --- 6. WEEKLY TREND ---
  $weekStart = date('Y-m-d 00:00:00', strtotime('monday this week'));
  $weekEnd   = date('Y-m-d 23:59:59', strtotime('sunday this week'));
  $weeklyQuery = "SELECT DATE(start_time) as appt_date, COUNT(*) as daily_count 
                  FROM appointments_tb 
                  WHERE branch_id = ? AND start_time BETWEEN ? AND ? 
                  AND status IN ('confirmed', 'checked_in', 'completed') $staffFilter
                  GROUP BY DATE(start_time)";
  $stmtWeekly = $pdo->prepare($weeklyQuery);
  $stmtWeekly->execute([$branchId, $weekStart, $weekEnd]);
  $weeklyResults = $stmtWeekly->fetchAll();
  $countsByDate = [];
  foreach($weeklyResults as $row) { $countsByDate[$row['appt_date']] = (int)$row['daily_count']; }
  $weeklyTrend = [];
  $currentDateObj = new DateTime($weekStart);
  for ($i = 0; $i < 7; $i++) {
      $dateStr = $currentDateObj->format('Y-m-d');
      $weeklyTrend[] = [ "day" => $currentDateObj->format('D'), "appointments" => $countsByDate[$dateStr] ?? 0, "isToday" => ($dateStr === date('Y-m-d')) ];
      $currentDateObj->modify('+1 day');
  }

  // --- 7. MAINTENANCE ---
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