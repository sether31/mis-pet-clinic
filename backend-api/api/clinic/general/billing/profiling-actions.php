<?php
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';

$decoded = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$pdo = (new Database())->pdo;

$action = $_GET['action'] ?? 'get_owners';
$branch_id = $_GET['branch_id'] ?? 'all';

try {
  // STEP 1: Get Unique Owners (Including Guests)
  if ($action === 'get_owners') {
      $sql = "SELECT 
                  u.user_id, 
                  COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Guest Walk-ins') as owner_name, 
                  u.profile_picture as user_image,
                  u.phone_number,
                  u.email,
                  COUNT(o.order_id) as total_records,
                  SUM(o.total_amount) as total_spent,
                  b.name as branch_name
              FROM order_tb o
              LEFT JOIN user_tb u ON o.user_id = u.user_id
              INNER JOIN clinic_branches_tb b ON o.branch_id = b.branch_id
              WHERE (:branch_id = 'all' OR o.branch_id = :branch_id)
              AND LOWER(o.order_status) NOT IN ('cancelled', 'rejected')
              GROUP BY u.user_id, b.name
              ORDER BY owner_name ASC";
      
      $stmt = $pdo->prepare($sql);
      $stmt->execute([':branch_id' => $branch_id]);
      echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
      exit;
  }

  // STEP 2: Get History based on pickup_date
  if ($action === 'get_history') {
      $owner_id = $_GET['owner_id'] ?? null;
      $type = $_GET['type']; // 'appointment' or 'product'

      $sql = "SELECT 
                  o.order_id, o.total_amount, o.created_at as transaction_date, o.pickup_date,
                  pay.payment_status, pay.payment_method,
                  b.name as branch_name
              FROM order_tb o
              LEFT JOIN payments_tb pay ON o.order_id = pay.order_id
              LEFT JOIN clinic_branches_tb b ON o.branch_id = b.branch_id
              WHERE (:branch_id = 'all' OR o.branch_id = :branch_id)";

      // Handle Guest (null) vs Registered User
      if (!$owner_id || $owner_id === 'null') {
          $sql .= " AND o.user_id IS NULL";
      } else {
          $sql .= " AND o.user_id = :owner_id";
      }

      // THE SEPARATION RULE:
      // Product = Has pickup_date | Appointment = No pickup_date
      if ($type === 'product') {
          $sql .= " AND (o.pickup_date IS NOT NULL AND o.pickup_date != '')";
      } else {
          $sql .= " AND (o.pickup_date IS NULL OR o.pickup_date = '')";
      }

      $sql .= " ORDER BY o.created_at DESC";

      $stmt = $pdo->prepare($sql);
      $params = [':branch_id' => $branch_id];
      if ($owner_id && $owner_id !== 'null') $params[':owner_id'] = $owner_id;
      
      $stmt->execute($params);
      $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

      foreach ($transactions as &$tx) {
          $itemStmt = $pdo->prepare("
            SELECT 
                oi.quantity, 
                oi.subtotal, 
                COALESCE(s.custom_name, p.name) as item_name,
                p.brand_name,
                p.brand_type,  -- ADD THIS
                p.dosage
            FROM order_items_tb oi
            LEFT JOIN branch_service_tb s ON oi.service_id = s.branch_service_id
            LEFT JOIN products_tb p ON oi.product_id = p.product_id
            WHERE oi.order_id = :oid
        ");
          $itemStmt->execute([':oid' => $tx['order_id']]);
          $tx['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
      }

      echo json_encode(["success" => true, "data" => $transactions]);
      exit;
  }
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}