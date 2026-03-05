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

  // Get the Product Data & Branch Name
  $stmt = $pdo->prepare(
    "SELECT 
      p.product_id, 
      p.branch_id,
      p.name, 
      p.description, 
      p.category, 
      p.prod_pic,
      b.name as branch_name,
      COALESCE(SUM(i.stock_level), 0) as total_stock,
      COALESCE((
        SELECT price 
        FROM inventory_tb 
        WHERE product_id = p.product_id 
          AND branch_id = p.branch_id 
          AND stock_level > 0 
          AND (expiry_date >= CURDATE() OR expiry_date IS NULL)
        ORDER BY expiry_date ASC 
        LIMIT 1
      ), 0.00) as price
    FROM products_tb p
    JOIN clinic_branches_tb b ON p.branch_id = b.branch_id 
    LEFT JOIN inventory_tb i 
      ON p.product_id = i.product_id 
      AND i.branch_id = p.branch_id
      AND i.stock_level > 0 
      AND (i.expiry_date >= CURDATE() OR i.expiry_date IS NULL)
    WHERE p.product_id = :product_id AND p.branch_id = :branch_id
    GROUP BY p.product_id, p.branch_id, p.name, p.description, p.category, p.prod_pic, b.name"
  );
  $stmt->execute([':product_id' => $product_id, ':branch_id' => $branch_id]);
  $product = $stmt->fetch();

  if(!$product) {
    throw new Exception("Product not found or unavailable.");
  }

  // Clean up data types
  $product['total_stock'] = (int)$product['total_stock'];
  $product['price'] = number_format((float)$product['price'], 2, '.', '');

  // Get the Branch Operating Hours
  $stmtHours = $pdo->prepare(
    "SELECT day_of_week, start_time, end_time, is_closed 
    FROM branch_operating_hours_tb 
    WHERE branch_id = :branch_id"
  );
  $stmtHours->execute([':branch_id' => $branch_id]);
  
  // Attach the schedule array directly to the product object
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