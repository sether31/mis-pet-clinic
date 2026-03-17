<?php
require_once '../../../config/database.php';
require_once '../../../middleware/auth-middleware.php'; 

validate_auth(['pet_owner']); 

if (!isset($_GET['branch_id']) || empty($_GET['branch_id'])) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Branch ID is required."]);
  exit();
}

$branch_id = htmlspecialchars(strip_tags($_GET['branch_id']));

try {
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare(
    "SELECT 
      p.product_id, 
      p.name, 
      p.description, 
      p.category, 
      p.prod_pic,
      COALESCE(SUM(i.stock_level), 0) as total_stock,
      COALESCE((
        SELECT price 
        FROM inventory_tb 
        WHERE product_id = p.product_id 
          AND branch_id = p.branch_id 
          AND stock_level > 0 
          AND is_active = 1 
          AND (expiry_date >= CURDATE() OR expiry_date IS NULL)
        ORDER BY expiry_date ASC 
        LIMIT 1
      ), 0.00) as price
    FROM products_tb p
    INNER JOIN inventory_tb i 
      ON p.product_id = i.product_id 
      AND i.branch_id = p.branch_id
      -- AND i.stock_level > 0 
      AND i.is_active = 1 
      AND (i.expiry_date >= CURDATE() OR i.expiry_date IS NULL)
    WHERE p.branch_id = :branch_id
    GROUP BY p.product_id, p.name, p.description, p.category, p.prod_pic
    ORDER BY p.category ASC, p.name ASC"
  );
  $stmt->execute([':branch_id' => $branch_id]);

  $products = [];

  while($row = $stmt->fetch()) {
    $row['total_stock'] = (int)$row['total_stock'];
    $row['price'] = number_format((float)$row['price'], 2, '.', '');
    
    array_push($products, $row);
  }

  http_response_code(200);
  echo json_encode([
    "success" => true,
    "count" => count($products),
    "data" => $products
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false, 
    "message" => "Database error: " . $e->getMessage()
  ]);
}
?>