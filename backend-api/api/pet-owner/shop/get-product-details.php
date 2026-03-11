<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';

validate_auth(['pet_owner']); 

if (!isset($_GET['product_id']) || empty($_GET['product_id']) || !isset($_GET['branch_id']) || empty($_GET['branch_id'])) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Product ID and Branch ID are required."]);
  exit();
}

$product_id = $_GET['product_id'];
$branch_id = $_GET['branch_id'];

try {
  $pdo = (new Database())->pdo;

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

  // FETCH BASE PRODUCT DETAILS
  $stmt = $pdo->prepare(
    "SELECT 
      p.product_id, 
      p.branch_id,
      p.name, 
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

  // grabs ONLY the stock level and price of the batch expiring first!
  $stmtInv = $pdo->prepare(
    "SELECT stock_level, price 
    FROM inventory_tb 
    WHERE product_id = :product_id 
      AND branch_id = :branch_id 
      AND stock_level > 0 
      AND (expiry_date >= CURDATE() OR expiry_date IS NULL)
    ORDER BY 
      CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END, 
      expiry_date ASC,                                
      inventory_id ASC                                
    LIMIT 1"
  );
  $stmtInv->execute([':product_id' => $product_id, ':branch_id' => $branch_id]);
  $inventory = $stmtInv->fetch();

  // If we found a valid batch, use its exact stock and price. Otherwise, set to 0.
  if ($inventory) {
    $product['total_stock'] = (int)$inventory['stock_level'];
    $product['price'] = number_format((float)$inventory['price'], 2, '.', '');
  } else {
    $product['total_stock'] = 0;
    $product['price'] = "0.00";
  }

  // GET OPERATING HOURS
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