<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

$decoded = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);
$branch_id_filter = $_GET['branch_id'] ?? 'all';
$user_id = $decoded->user_id;
$role = $decoded->role;

try {
  $database = new Database();
  $pdo = $database->pdo;

  // 1. Get clinic context
  $clinic_id = null;
  if ($role === 'clinic_admin') {
    $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinics_tb WHERE created_by = :user_id LIMIT 1");
    $stmtClinic->execute([':user_id' => $user_id]);
    $clinic_id = $stmtClinic->fetchColumn();
  } else {
    $stmtClinic = $pdo->prepare(
      "SELECT b.clinic_id FROM branch_staff_tb s
       JOIN clinic_branches_tb b ON s.branch_id = b.branch_id
       WHERE s.user_id = :user_id LIMIT 1"
    );
    $stmtClinic->execute([':user_id' => $user_id]);
    $clinic_id = $stmtClinic->fetchColumn();
  }

  if (!$clinic_id) throw new Exception("Unauthorized: Clinic association not found.");

  // 2. Get approved branches
  $stmtBranches = $pdo->prepare(
    "SELECT DISTINCT b.branch_id as id, b.name FROM clinic_branches_tb b
     INNER JOIN branch_subscriptions_tb s ON b.branch_id = s.branch_id
     WHERE b.clinic_id = :clinic_id AND b.status = 'approved' AND s.status = 'active'"
  );

  $stmtBranches->execute([':clinic_id' => $clinic_id]);
  $branches = $stmtBranches->fetchAll();

  // 3. Fetch all raw transactions for this clinic/branch
  $sql = "SELECT
    o.order_id as transaction_id,
    o.user_id,
    o.total_amount as amount,
    o.order_status as transaction_status,
    CASE 
        WHEN (o.pickup_date IS NOT NULL AND o.pickup_date != '') THEN o.pickup_date
        WHEN a.start_time IS NOT NULL THEN a.start_time
        ELSE o.created_at
    END as display_date,
    o.created_at as transaction_date,
    o.pickup_date, 
    o.branch_id,
    pay.payment_method,
    pay.payment_status,
    pay.cash_received,
    pay.cash_change,
    b.name as branch_name,
    a.appointment_id,
    a.start_time, 
    p.name as pet_name,
    p.pet_picture as pet_image,
    u_owner.profile_picture as user_image,
    u_owner.email as owner_email,
    u_owner.phone_number as owner_phone,
    CONCAT(u_owner.first_name, ' ', u_owner.last_name) as owner_name,
    CASE WHEN a.appointment_id IS NOT NULL THEN 'Appointment' ELSE 'Retail/Product' END as source_type
    FROM order_tb o
    JOIN clinic_branches_tb b ON o.branch_id = b.branch_id
    LEFT JOIN payments_tb pay ON o.order_id = pay.order_id
    LEFT JOIN appointments_tb a ON a.order_id = o.order_id
    LEFT JOIN pet_tb p ON a.pet_id = p.pet_id
    LEFT JOIN user_tb u_owner ON o.user_id = u_owner.user_id
    WHERE b.clinic_id = :clinic_id
    AND b.status = 'approved'
    AND LOWER(o.order_status) IN ('paid', 'completed', 'billed', 'fully paid')";

  $params = [':clinic_id' => $clinic_id];

  if($branch_id_filter && $branch_id_filter !== 'all') {
    $sql .= " AND o.branch_id = :branch_id";
    $params[':branch_id'] = $branch_id_filter;
  }

  if(!in_array($role, ['clinic_admin', 'branch_admin'])) {
    $sql .= " AND (a.staff_id = (SELECT staff_id FROM branch_staff_tb WHERE user_id = :user_id LIMIT 1) OR a.appointment_id IS NULL)";
    $params[':user_id'] = $user_id;
  }

  $sql .= " ORDER BY o.created_at DESC";
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $rawTransactions = $stmt->fetchAll();

  // 4. Summaries & Grouping by Owner Profile
  $summary = [
    "total_billings" => 0,
    "amount_collected" => 0,
    "amount_uncollected" => 0,
    "total_appointments" => 0,
    "total_retail" => 0
  ];

  $profiles = [];

  if(count($rawTransactions) > 0) {
    $transactionIds = array_column($rawTransactions, 'transaction_id');
    $placeholders = implode(',', array_fill(0, count($transactionIds), '?'));
    
    // ==========================================
    // THIS IS THE FIX: Subquery with FIND_IN_SET
    // ==========================================
    $itemStmt = $pdo->prepare("
      SELECT oi.*, 
        (SELECT GROUP_CONCAT(custom_name SEPARATOR ', ') 
         FROM branch_service_tb 
         WHERE FIND_IN_SET(branch_service_id, REPLACE(COALESCE(oi.service_id, ''), ' ', ''))
        ) as service_name, 
        prod.name as product_name,
        prod.brand_name,   
        prod.brand_type,   
        prod.dosage        
      FROM order_items_tb oi
      LEFT JOIN products_tb prod ON oi.product_id = prod.product_id
      WHERE oi.order_id IN ($placeholders)
    ");

    $itemStmt->execute($transactionIds);
    $allItems = $itemStmt->fetchAll();

    $itemsByOrder = [];

    foreach ($allItems as $item) {
      $itemsByOrder[$item['order_id']][] = $item;
    }

    // Process and Group
    foreach ($rawTransactions as $t) {
      $amount = (float)$t['amount'];
      $isPaid = (strtolower($t['transaction_status']) === 'paid' || strtolower($t['payment_status'] ?? '') === 'paid');
      
      $summary['total_billings'] += $amount;
      if($isPaid) $summary['amount_collected'] += $amount; else $summary['amount_uncollected'] += $amount;
      if($t['source_type'] === 'Appointment') $summary['total_appointments']++; else $summary['total_retail']++;

      $uid = $t['user_id'];
      if(!isset($profiles[$uid])) {
        $profiles[$uid] = [
          "user_id" => $uid,
          "owner_name" => $t['owner_name'],
          "user_image" => $t['user_image'],
          "owner_email" => $t['owner_email'],
          "branch_name" => $t['branch_name'],
          "total_spent" => 0,
          "transaction_count" => 0,
          "history" => []
        ];
      }

      $t['items'] = $itemsByOrder[$t['transaction_id']] ?? [];
      $profiles[$uid]['total_spent'] += $amount;
      $profiles[$uid]['transaction_count']++;
      $profiles[$uid]['history'][] = $t;
    }
  }

  echo json_encode([
    "success" => true,
    "data" => array_values($profiles), 
    "summary" => $summary,
    "branches" => $branches
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>