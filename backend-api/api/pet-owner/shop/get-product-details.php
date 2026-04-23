<?php
ob_clean();
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';

$decoded = validate_auth(['pet_owner']); 

if (!isset($_GET['product_id']) || empty($_GET['product_id']) || !isset($_GET['branch_id']) || empty($_GET['branch_id'])) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Product ID and Branch ID are required."]);
  exit();
}

$product_id = $_GET['product_id'];
$branch_id = $_GET['branch_id'];

try {
  $pdo = (new Database())->pdo;

  // 1. CLINIC STATUS & SUBSCRIPTION CHECK
  $checkStmt = $pdo->prepare(
      "SELECT 
          cb.is_maintenance, 
          cb.status, 
          (SELECT COUNT(*) FROM branch_subscriptions_tb bs 
              WHERE bs.branch_id = cb.branch_id 
              AND LOWER(bs.status) = 'active' 
              AND bs.end_date >= CURDATE()
          ) as has_sub,
          (SELECT sub.has_shop FROM branch_subscriptions_tb bs 
              JOIN subscription_tb sub ON bs.subscription_id = sub.subscription_id
              WHERE bs.branch_id = cb.branch_id 
              AND LOWER(bs.status) = 'active' 
              AND bs.end_date >= CURDATE()
              LIMIT 1
          ) as has_shop
      FROM clinic_branches_tb cb 
      WHERE cb.branch_id = ?"
  );
  $checkStmt->execute([$branch_id]);
  $clinicCheck = $checkStmt->fetch();

  if (!$clinicCheck || 
      $clinicCheck['is_maintenance'] == 1 || 
      strtolower($clinicCheck['status']) !== 'approved' || 
      $clinicCheck['has_sub'] == 0 ||
      $clinicCheck['has_shop'] == 0
  ) {
      echo json_encode([
          "success" => false, 
          "is_unavailable" => true, 
          "message" => "This clinic's shop is currently under maintenance or unavailable."
      ]);
      exit; 
  }

  // 2. FETCH BASE PRODUCT DETAILS (Added brand/dosage fields)
  $stmt = $pdo->prepare(
      "SELECT 
          p.product_id, 
          p.branch_id,
          p.name, 
          p.brand_name,
          p.brand_type,
          p.dosage,
          p.description, 
          p.category, 
          p.prod_pic,
          b.logo_picture as branch_image,
          b.name as branch_name
      FROM products_tb p
      JOIN clinic_branches_tb b ON p.branch_id = b.branch_id 
      WHERE p.product_id = :product_id AND p.branch_id = :branch_id
      LIMIT 1"
  );
  $stmt->execute([':product_id' => $product_id, ':branch_id' => $branch_id]);
  $product = $stmt->fetch();

  if(!$product) {
      throw new Exception("Product not found.");
  }

  // 3. FETCH BEST AVAILABLE INVENTORY
  $stmtInv = $pdo->prepare(
      "SELECT stock_level, price, expiry_date, is_active 
      FROM inventory_tb 
      WHERE product_id = :product_id 
          AND branch_id = :branch_id 
      ORDER BY 
          is_active DESC, 
          CASE WHEN stock_level > 0 THEN 0 ELSE 1 END ASC, 
          CASE WHEN expiry_date >= CURDATE() OR expiry_date IS NULL THEN 0 ELSE 1 END ASC, 
          CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END, 
          expiry_date ASC,                                 
          inventory_id DESC                
      LIMIT 1"
  );
  $stmtInv->execute([':product_id' => $product_id, ':branch_id' => $branch_id]);
  $inventory = $stmtInv->fetch();

  if ($inventory) {
      $product['price'] = number_format((float)$inventory['price'], 2, '.', '');
      $today = date('Y-m-d');
      $is_expired = ($inventory['expiry_date'] !== null && $inventory['expiry_date'] < $today);
      $is_archived = ($inventory['is_active'] == 0);

      if ($is_expired || $is_archived) {
          $product['total_stock'] = 0; 
      } else {
          $product['total_stock'] = (int)$inventory['stock_level'];
      }
  } else {
      $product['total_stock'] = 0;
      $product['price'] = "0.00";
  }

  // 4. GET OPERATING HOURS
  $stmtHours = $pdo->prepare(
      "SELECT day_of_week, start_time, end_time, is_closed 
      FROM branch_operating_hours_tb 
      WHERE branch_id = :branch_id"
  );
  $stmtHours->execute([':branch_id' => $branch_id]);
  $product['schedule'] = $stmtHours->fetchAll();

  http_response_code(200);
  echo json_encode([
      "success" => true,
      "data" => $product
  ]);

} catch (Exception $e) {
  http_response_code(404);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>