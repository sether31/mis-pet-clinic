<?php
ob_clean();
require_once __DIR__ . '/../../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../../config/Database.php';

$user = validate_auth(['clinic_admin']); 

try {
  $pdo = (new Database())->pdo;
  $filter = $_GET['filter'] ?? 'today';

  $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinics_tb WHERE created_by = ? LIMIT 1");
  $stmtClinic->execute([$user->user_id]);
  $clinicId = $stmtClinic->fetchColumn();

  if (!$clinicId) throw new Exception("Clinic not found.");

  // --- 1. DATE LOGIC SETUP ---
  $dateCondition = "DATE(created_at) = CURDATE()"; 
  if ($filter === 'week') {
      $dateCondition = "YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)";
  } elseif ($filter === 'month') {
      $dateCondition = "YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())";
  } elseif ($filter === 'year') {
      $dateCondition = "YEAR(created_at) = YEAR(CURDATE())";
  }

  $orderDateCondition = str_replace("created_at", "o.created_at", $dateCondition);
  $apptDateCondition = str_replace("created_at", "a.start_time", $dateCondition);

  // --- 2. GLOBAL STATS (For Dashboard Cards) ---
  
  // Appointments Card: Completed today (based on start_time)
  $stmtGlobalAppts = $pdo->prepare("
      SELECT COUNT(*) FROM appointments_tb a
      WHERE branch_id IN (SELECT branch_id FROM clinic_branches_tb WHERE clinic_id = ? AND LOWER(status) = 'approved') 
      AND LOWER(status) = 'completed' 
      AND $apptDateCondition
  ");
  $stmtGlobalAppts->execute([$clinicId]);
  $globalAppts = (int)$stmtGlobalAppts->fetchColumn();

  // UPDATED: Reservations Card (Confirmed + Completed)
  $stmtGlobalRes = $pdo->prepare("
      SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items_tb oi
      JOIN order_tb o ON oi.order_id = o.order_id
      LEFT JOIN appointments_tb a ON o.order_id = a.order_id
      WHERE o.branch_id IN (SELECT branch_id FROM clinic_branches_tb WHERE clinic_id = ? AND LOWER(status) = 'approved') 
      AND LOWER(o.order_status) IN ('confirmed', 'completed') 
      AND a.appointment_id IS NULL 
      AND $orderDateCondition
  ");
  $stmtGlobalRes->execute([$clinicId]);
  $globalRes = (int)$stmtGlobalRes->fetchColumn();

  // Revenue Card: Paid today
  $stmtGlobalRev = $pdo->prepare("
      SELECT COALESCE(SUM(p.amount), 0) FROM payments_tb p
      LEFT JOIN appointments_tb a ON p.order_id = a.order_id AND LOWER(p.payment_type) = 'appointment'
      LEFT JOIN order_tb o ON p.order_id = o.order_id AND LOWER(p.payment_type) = 'product'
      WHERE p.branch_id IN (SELECT branch_id FROM clinic_branches_tb WHERE clinic_id = ? AND LOWER(status) = 'approved') 
      AND LOWER(p.payment_status) = 'paid' 
      AND (
          (LOWER(p.payment_type) = 'appointment' AND $apptDateCondition) OR 
          (LOWER(p.payment_type) = 'product' AND $orderDateCondition)
      )
  ");
  $stmtGlobalRev->execute([$clinicId]);
  $globalRev = (float)$stmtGlobalRev->fetchColumn();

  // --- 3. PER-BRANCH DATA (For Table & Charts) ---
  $stmtBranches = $pdo->prepare("SELECT branch_id, name, status, is_maintenance FROM clinic_branches_tb WHERE clinic_id = ? AND LOWER(status) = 'approved'");
  $stmtBranches->execute([$clinicId]);
  $branches = $stmtBranches->fetchAll(PDO::FETCH_ASSOC);

  $branchDataList = [];

  foreach ($branches as $branch) {
      $bid = $branch['branch_id'];

      // Branch Appts - COMPLETED
      $stmtAppts = $pdo->query("
          SELECT COUNT(*) FROM appointments_tb a 
          WHERE branch_id = $bid AND LOWER(status) = 'completed' AND $apptDateCondition
      ");
      $branchAppts = (int)$stmtAppts->fetchColumn();

      // Branch Reservations - COMPLETED (For historical performance)
      $stmtOrders = $pdo->query("
          SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items_tb oi
          JOIN order_tb o ON oi.order_id = o.order_id
          LEFT JOIN appointments_tb a ON o.order_id = a.order_id
          WHERE o.branch_id = $bid AND LOWER(o.order_status) = 'completed' 
          AND a.appointment_id IS NULL AND $orderDateCondition
      ");
      $branchOrders = (int)$stmtOrders->fetchColumn();

      // Branch Revenue - PAID
      $stmtRev = $pdo->query("
          SELECT COALESCE(SUM(p.amount), 0) FROM payments_tb p
          LEFT JOIN appointments_tb a ON p.order_id = a.order_id AND LOWER(p.payment_type) = 'appointment'
          LEFT JOIN order_tb o ON p.order_id = o.order_id AND LOWER(p.payment_type) = 'product'
          WHERE p.branch_id = $bid AND LOWER(p.payment_status) = 'paid' 
          AND (
              (LOWER(p.payment_type) = 'appointment' AND $apptDateCondition) OR 
              (LOWER(p.payment_type) = 'product' AND $orderDateCondition)
          )
      ");
      $branchRev = (float)$stmtRev->fetchColumn();

      $stmtSub = $pdo->prepare("SELECT COUNT(*) FROM branch_subscriptions_tb WHERE branch_id = ? AND status = 'active' AND end_date >= CURDATE()");
      $stmtSub->execute([$bid]);
      $hasActiveSub = (int)$stmtSub->fetchColumn() > 0;

      $branchDataList[] = [
          'branch_id' => $bid,
          'name' => $branch['name'],
          'appts' => $branchAppts,
          'reservations' => $branchOrders, 
          'revenue' => $branchRev,
          'status' => $branch['is_maintenance'] == 1 ? 'Maintenance' : $branch['status'],
          'sub_status' => $hasActiveSub ? 'Active' : 'Expired'
      ];
  }

  // --- 4. FINAL OUTPUT ---
  echo json_encode([
    "success" => true,
    "data" => [
      "stats" => [
        "total_branches" => (int)$pdo->query("SELECT COUNT(*) FROM clinic_branches_tb WHERE clinic_id = $clinicId AND LOWER(status) = 'approved'")->fetchColumn(),
        "total_staff" => (int)$pdo->query("SELECT COUNT(*) FROM branch_staff_tb WHERE branch_id IN (SELECT branch_id FROM clinic_branches_tb WHERE clinic_id = $clinicId AND LOWER(status) = 'approved') AND status = 1")->fetchColumn(),
        "today_reservations" => $globalRes, // Confirmed + Completed
        "today_appointments" => $globalAppts, // Completed
        "today_revenue" => $globalRev
      ],
      "branches" => $branchDataList
    ]
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}