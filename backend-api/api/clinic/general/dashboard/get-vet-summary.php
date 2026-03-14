<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

$user = validate_auth(['branch_admin', 'veterinarian', 'groomer', 'staff']);

try {
  $pdo = (new Database())->pdo;
  $branchId = $user->branch_id;
  $userId = $user->user_id;

  // FETCH PERMISSIONS DIRECTLY FROM DATABASE
  $stmtPerms = $pdo->prepare("SELECT permissions FROM branch_staff_tb WHERE user_id = ? AND branch_id = ? AND status = 1");
  $stmtPerms->execute([$userId, $branchId]);
  $staffRow = $stmtPerms->fetch();
  
  $permissions = $staffRow ? json_decode($staffRow['permissions'], true) : [];
  if (!is_array($permissions)) $permissions = [];

  // Today's boundaries
  $todayStart = date('Y-m-d 00:00:00');
  $todayEnd   = date('Y-m-d 23:59:59');

  // FETCH DASHBOARD STATS
  $stmtStats = $pdo->prepare(
    "SELECT 
      (SELECT COUNT(*) FROM appointments_tb 
        WHERE branch_id = ? 
        AND start_time BETWEEN ? AND ? 
        AND status IN ('confirmed', 'completed')) AS today_appointments,

      (SELECT COUNT(DISTINCT pet_id) FROM appointments_tb 
        WHERE branch_id = ?) AS total_patients,

      (SELECT COALESCE(SUM(amount), 0) FROM payments_tb 
        WHERE branch_id = ? 
        AND payment_status = 'paid' 
        AND created_at BETWEEN ? AND ?) AS today_billings,
        
      (SELECT COUNT(*) FROM inventory_tb 
        WHERE branch_id = ? 
        AND is_active = 1
        AND (stock_level <= min_stock_level OR expiry_date < CURDATE())) AS stock_alerts,

      (SELECT COUNT(*) FROM order_tb 
        WHERE branch_id = ? 
        AND order_status = 'pending') AS pending_reservations"
  );
  $stmtStats->execute([
    $branchId, $todayStart, $todayEnd, 
    $branchId,                         
    $branchId, $todayStart, $todayEnd, 
    $branchId,                         
    $branchId                          
  ]);
  $statsData = $stmtStats->fetch();

  // FETCH UPCOMING APPOINTMENTS LIST
  $stmtAppt = $pdo->prepare(
    "SELECT 
      a.appointment_id,
      a.status AS appointment_status,
      a.start_time,
      a.end_time,
      DATE_FORMAT(a.start_time, '%h:%i %p') AS start_time_formatted,
      DATE_FORMAT(a.end_time, '%h:%i %p') AS end_time_formatted,
      p.name AS pet_name, 
      p.pet_picture,
      CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
      bs.custom_name AS service_type
    FROM appointments_tb a
    JOIN pet_tb p ON a.pet_id = p.pet_id
    JOIN user_tb u ON a.user_id = u.user_id
    LEFT JOIN branch_service_tb bs ON a.service_id = bs.branch_service_id
    WHERE a.branch_id = ?
    AND a.start_time BETWEEN ? AND ?
    AND a.status IN ('confirmed', 'pending')
    ORDER BY a.start_time ASC
    LIMIT 8"
  );
  $stmtAppt->execute([$branchId, $todayStart, $todayEnd]);
  $appointmentsData = $stmtAppt->fetchAll();

  // FETCH TOP 3 RESERVATIONS (IF PERMISSION ALLOWS)
  $upcomingReservations = [];
  if(in_array('shop_management', $permissions)) {
    $stmtRes = $pdo->prepare(
      "SELECT 
        o.order_id,
        o.order_status as status,
        o.pickup_date, -- Use the actual pickup date column
        CONCAT(u.first_name, ' ', u.last_name) as customer_name,
        (SELECT p.prod_pic FROM order_items_tb oi 
          JOIN products_tb p ON oi.product_id = p.product_id 
          WHERE oi.order_id = o.order_id LIMIT 1) as first_item_pic,
        (SELECT GROUP_CONCAT(p.name SEPARATOR ', ')
          FROM order_items_tb oi 
          JOIN products_tb p ON oi.product_id = p.product_id 
          WHERE oi.order_id = o.order_id) as items_summary
      FROM order_tb o
      JOIN user_tb u ON o.user_id = u.user_id
      WHERE o.branch_id = ? AND o.order_status IN ('pending', 'confirmed')
      ORDER BY o.pickup_date ASC LIMIT 3" 
    );
    $stmtRes->execute([$branchId]);
    $upcomingReservations = $stmtRes->fetchAll();
}

  // FETCH WEEKLY WORKLOAD
  $weekStart = date('Y-m-d 00:00:00', strtotime('monday this week'));
  $weekEnd   = date('Y-m-d 23:59:59', strtotime('sunday this week'));

  $stmtWeekly = $pdo->prepare(
    "SELECT 
      DATE(start_time) as appt_date, 
      COUNT(*) as daily_count
    FROM appointments_tb 
    WHERE branch_id = ? 
    AND start_time BETWEEN ? AND ? 
    AND status IN ('confirmed', 'checked_in', 'completed')
    GROUP BY DATE(start_time)"
  );
  $stmtWeekly->execute([$branchId, $weekStart, $weekEnd]);
  $weeklyResults = $stmtWeekly->fetchAll();

  $countsByDate = [];
  foreach($weeklyResults as $row) {
    $countsByDate[$row['appt_date']] = (int)$row['daily_count'];
  }

  $weeklyTrend = [];
  $currentDateObj = new DateTime($weekStart);
  $todayDateStr = date('Y-m-d'); 

  for ($i = 0; $i < 7; $i++) {
    $dateStr = $currentDateObj->format('Y-m-d');
    $dayName = $currentDateObj->format('D'); 
    
    $weeklyTrend[] = [
      "day" => $dayName,
      "appointments" => $countsByDate[$dateStr] ?? 0,
      "isToday" => ($dateStr === $todayDateStr) 
    ];
    $currentDateObj->modify('+1 day');
  }

  echo json_encode([
    "success" => true,
    "data" => [
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
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}