<?php
ob_clean();
require_once '../../../middleware/auth-middleware.php'; 
require_once '../../../config/Database.php';

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
        -- Calculate Sellable Stock (Active and not expired)
        COALESCE(SUM(
            CASE 
                WHEN i.is_active = 1 AND (i.expiry_date > CURDATE() OR i.expiry_date IS NULL) 
                THEN i.stock_level 
                ELSE 0 
            END
        ), 0) as total_stock,
        -- Price Logic (Prioritize price from active, non-expired batches)
        COALESCE((
            SELECT price 
            FROM inventory_tb 
            WHERE product_id = p.product_id 
              AND branch_id = p.branch_id 
              AND is_active = 1 
            ORDER BY 
              CASE WHEN (expiry_date > CURDATE() OR expiry_date IS NULL) THEN 0 ELSE 1 END ASC,
              expiry_date ASC 
            LIMIT 1
        ), 0.00) as price
        FROM products_tb p
        INNER JOIN inventory_tb i 
            ON p.product_id = i.product_id 
            AND i.branch_id = p.branch_id
        WHERE p.branch_id = :branch_id
        GROUP BY p.product_id, p.name, p.description, p.category, p.prod_pic
        -- THE HIDER: Only return products that have actual sellable stock remaining
        HAVING SUM(
            CASE 
                WHEN i.is_active = 1 AND (i.expiry_date > CURDATE() OR i.expiry_date IS NULL) 
                THEN i.stock_level 
                ELSE 0 
            END
        ) > 0
        ORDER BY p.category ASC, p.name ASC"
    );

  $stmt->execute([':branch_id' => $branch_id]);

  $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $products = [];

  foreach ($results as $row) {
      $row['total_stock'] = (int)$row['total_stock'];
      $row['price'] = number_format((float)$row['price'], 2, '.', '');
      $products[] = $row;
  }

  http_response_code(200);
  echo json_encode([
      "success" => true,
      "count" => count($products),
      "data" => $products
  ]);

} catch (Throwable $e) { 
  http_response_code(500);
  echo json_encode([
      "success" => false, 
      "message" => "Server error: " . $e->getMessage()
  ]);
}
?>