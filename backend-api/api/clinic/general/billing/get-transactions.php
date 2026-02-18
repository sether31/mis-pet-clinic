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

  // get clinic
  $clinic_id = null;
  if ($role === 'clinic_admin') {
    $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinics_tb WHERE created_by = :user_id LIMIT 1");
    $stmtClinic->execute([':user_id' => $user_id]);
    $clinic_id = $stmtClinic->fetchColumn();
  } else {
    $stmtClinic = $pdo->prepare(
      "SELECT b.clinic_id 
      FROM branch_staff_tb s
      JOIN clinic_branches_tb b ON s.branch_id = b.branch_id
      WHERE s.user_id = :user_id LIMIT 1"
    );
    $stmtClinic->execute([':user_id' => $user_id]);
    $clinic_id = $stmtClinic->fetchColumn();
  }

  if (!$clinic_id) throw new Exception("Unauthorized: Clinic association not found.");

  // get approved branch
  $stmtBranches = $pdo->prepare(
    "SELECT DISTINCT b.branch_id as id, b.name 
    FROM clinic_branches_tb b
    INNER JOIN branch_subscriptions_tb s ON b.branch_id = s.branch_id
    WHERE b.clinic_id = :clinic_id 
    AND b.status = 'approved'
    AND s.status = 'active'"
  );
  $stmtBranches->execute([':clinic_id' => $clinic_id]);
  $branches = $stmtBranches->fetchAll();

  $sql = "SELECT 
    o.order_id as transaction_id,
    o.total_amount as amount,
    o.order_status as transaction_status,
    o.created_at as transaction_date,
    o.branch_id,
    pay.payment_method,
    pay.payment_status,
    b.name as branch_name,
    a.appointment_id,
    p.name as pet_name,
    CONCAT(u_owner.first_name, ' ', u_owner.last_name) as owner_name,
    CASE 
      WHEN a.appointment_id IS NOT NULL THEN 'Appointment' 
      ELSE 'Retail/Product' 
    END as source_type
    FROM order_tb o
    JOIN clinic_branches_tb b ON o.branch_id = b.branch_id
    LEFT JOIN payments_tb pay ON o.order_id = pay.order_id
    LEFT JOIN appointments_tb a ON a.order_id = o.order_id
    LEFT JOIN pet_tb p ON a.pet_id = p.pet_id
    LEFT JOIN user_tb u_owner ON o.user_id = u_owner.user_id
    WHERE b.clinic_id = :clinic_id 
    AND b.status = 'approved'"; 

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
    $transactions = $stmt->fetchAll();

    // card data
    $summary = [
      "total_billings" => 0,
      "amount_collected" => 0, 
      "amount_uncollected" => 0,
      "total_appointments" => 0,
      "total_retail" => 0
    ];

    if(count($transactions) > 0) {
      $transactionIds = array_column($transactions, 'transaction_id');
      $placeholders = implode(',', array_fill(0, count($transactionIds), '?'));
      
      $itemStmt = $pdo->prepare(
        "SELECT 
          oi.*, 
          s.custom_name as service_name, 
          prod.name as product_name 
        FROM order_items_tb oi 
        LEFT JOIN branch_service_tb s ON oi.service_id = s.branch_service_id
        LEFT JOIN products_tb prod ON oi.product_id = prod.product_id
        WHERE oi.order_id IN ($placeholders)"
      );
      $itemStmt->execute($transactionIds);
      $allItems = $itemStmt->fetchAll();

      $itemsByOrder = [];
      foreach ($allItems as $item) {
        $itemsByOrder[$item['order_id']][] = $item;
      }

      foreach ($transactions as &$transaction) {
        $amount = (float)$transaction['amount'];
        $status = strtolower($transaction['transaction_status']);
        $payStatus = strtolower($transaction['payment_status'] ?? '');
        
        $isPaid = ($status === 'paid' || $payStatus === 'paid' || $payStatus === 'completed');
        
        $transaction['items'] = $itemsByOrder[$transaction['transaction_id']] ?? [];

        // update Summary
        $summary['total_billings'] += $amount;
        if($isPaid) {
          $summary['amount_collected'] += $amount;
        } else {
          $summary['amount_uncollected'] += $amount;
        }

        if($transaction['source_type'] === 'Appointment') {
          $summary['total_appointments']++;
        } else {
          $summary['total_retail']++;
        }
      }
    }

  echo json_encode([
    "success" => true, 
    "data" => $transactions, 
    "summary" => $summary,
    "branches" => $branches 
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}