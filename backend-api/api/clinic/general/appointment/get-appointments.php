<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

$decoded = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$branch_id = $_GET['branch_id'] ?? null;
$user_id = $decoded->user_id;
$role = $decoded->role;

try {
  $pdo = (new Database())->pdo;

  $sql = "SELECT 
        a.appointment_id as id,
        a.start_time as start,
        a.end_time as end,
        a.staff_id, 
        a.status,   
        a.updated_at,
        a.order_id, 
        p.pet_picture,       
        p.name as pet_name,
        p.breed,
        p.species,
        p.sex,
        p.birthdate, 
        p.medical_conditions,

        -- Payment Details from payments_tb
        pay.amount as total_amount,
        pay.cash_received,
        pay.cash_change,
        pay.payment_method,
        pay.payment_status,

        (SELECT GROUP_CONCAT(custom_name SEPARATOR ', ') 
         FROM branch_service_tb 
         WHERE FIND_IN_SET(branch_service_id, REPLACE(a.service_id, ' ', ''))
        ) as service_names,

        u_staff.first_name as staff_fname, 
        u_staff.last_name as staff_lname,
        u_owner.first_name as owner_fname, 
        u_owner.last_name as owner_lname,
        u_owner.email,
        u_owner.phone_number,
        CONCAT(u_owner.first_name, ' ', u_owner.last_name) as owner_name,
        CONCAT(u_staff.first_name, ' ', u_staff.last_name) as staff_name,
        CONCAT(u_updater.first_name, ' ', u_updater.last_name) as updated_by_name           
    FROM appointments_tb a
    JOIN clinic_branches_tb b ON a.branch_id = b.branch_id
    LEFT JOIN branch_staff_tb bs ON a.staff_id = bs.staff_id
    LEFT JOIN user_tb u_staff ON bs.user_id = u_staff.user_id
    LEFT JOIN pet_tb p ON a.pet_id = p.pet_id
    LEFT JOIN user_tb u_owner ON p.owner_id = u_owner.user_id
    LEFT JOIN user_tb u_updater ON a.last_updated_by = u_updater.user_id
    -- JOIN to payments_tb using order_id
    LEFT JOIN payments_tb pay ON a.order_id = pay.order_id
    WHERE a.branch_id = :branch_id";

  $params = [':branch_id' => $branch_id];
  
  $adminRoles = ['clinic_admin', 'branch_admin', 'staff'];
  if(!in_array($role, $adminRoles)) {
    $sql .= " AND bs.user_id = :user_id";
    $params[':user_id'] = $user_id;
  }

  $sql .= " GROUP BY a.appointment_id ORDER BY a.start_time ASC";

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $today = new DateTime();
  
  foreach ($data as &$row) {
      // --- AGE CALCULATION ---
      if (!empty($row['birthdate'])) {
          $birthDate = new DateTime($row['birthdate']);
          $diff = $today->diff($birthDate);
          if ($diff->y > 0) $row['age'] = $diff->y . "yrs old";
          elseif ($diff->m > 0) $row['age'] = $diff->m . "m old";
          else $row['age'] = $diff->d . "d old";
      } else {
          $row['age'] = "Unknown";
      }

      // --- FETCH ORDER ITEMS ---
      $row['product_total'] = 0; // Initialize total for products only
      
      if (!empty($row['order_id'])) {
          $stmtItems = $pdo->prepare("
              SELECT 
                  oi.quantity, 
                  oi.price, 
                  oi.subtotal,
                  oi.product_id,
                  oi.service_id,
                  COALESCE(prod.name, serv.custom_name, 'Unknown Item') as item_name,
                  IF(oi.product_id IS NOT NULL, 'product', 'service') as item_type
              FROM order_items_tb oi
              LEFT JOIN products_tb prod ON oi.product_id = prod.product_id
              LEFT JOIN branch_service_tb serv ON oi.service_id = serv.branch_service_id
              WHERE oi.order_id = ?
          ");
          $stmtItems->execute([$row['order_id']]);
          $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
          
          // Calculate Product Total separately so frontend can use it
          foreach ($items as $item) {
              if ($item['item_type'] === 'product') {
                  $row['product_total'] += $item['subtotal'];
              }
          }
          
          $row['order_items'] = $items;
      } else {
          $row['order_items'] = [];
      }
  }

  echo json_encode(["success" => true, "data" => $data]);
} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}