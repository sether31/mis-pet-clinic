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

  // We join p.* with a subquery that handles the complex Inventory logic
  $query = "SELECT 
              p.*, 
              inv.total_stock,
              inv.price
            FROM products_tb p
            INNER JOIN (
                SELECT 
                    product_id,
                    -- Sum only active and non-expired stock
                    SUM(CASE 
                        WHEN is_active = 1 AND (expiry_date > CURDATE() OR expiry_date IS NULL) 
                        THEN stock_level 
                        ELSE 0 
                    END) as total_stock,
                    -- FEFO Price: Get price of the batch expiring soonest
                    (
                        SELECT price 
                        FROM inventory_tb i2 
                        WHERE i2.product_id = i1.product_id 
                          AND i2.branch_id = i1.branch_id 
                          AND i2.is_active = 1 
                          AND (i2.expiry_date > CURDATE() OR i2.expiry_date IS NULL)
                        ORDER BY 
                          expiry_date IS NULL ASC, -- Put NULL expiries at the end
                          expiry_date ASC 
                        LIMIT 1
                    ) as price
                FROM inventory_tb i1
                WHERE branch_id = :branch_id
                GROUP BY product_id
            ) inv ON p.product_id = inv.product_id
            WHERE p.branch_id = :branch_id 
              AND inv.total_stock > 0 -- The 'Hider': Only show items with stock
            ORDER BY p.category ASC, p.name ASC";

  $stmt = $pdo->prepare($query);
  $stmt->execute([':branch_id' => $branch_id]);

  $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $products = [];

  foreach ($results as $row) {
      $row['total_stock'] = (int)$row['total_stock'];
      // Ensure price is formatted correctly for the frontend
      $row['price'] = number_format((float)($row['price'] ?? 0), 2, '.', '');
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