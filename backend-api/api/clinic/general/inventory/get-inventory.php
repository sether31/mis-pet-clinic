<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

$branch_id = $_GET['branchId'] ?? null;

if(!$branch_id) {
  echo json_encode(["success" => false, "message" => "Branch ID is required"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare(
    "SELECT 
      p.product_id, 
      p.name, 
      p.description,
      p.category,
      p.prod_pic, 
      i.inventory_id,
      i.stock_level,
      i.unit_cost,
      i.price,
      i.expiry_date,
      i.min_stock_level,
      i.supplier_name,
      i.supplier_contact,
      i.is_active
    FROM products_tb p
    INNER JOIN inventory_tb i ON p.product_id = i.product_id
    WHERE i.branch_id = :branch_id
    ORDER BY i.expiry_date ASC, p.name ASC"
  );
  $stmt->execute([':branch_id' => $branch_id]);
  $inventory = $stmt->fetchAll();

  // initialize card data
  $cardData = [
    "total_items" => count($inventory),
    "active_products" => 0,
    "low_stock" => 0,
    "out_of_stock" => 0,
    "expiring_soon" => 0, 
    "expired_items" => 0  
  ];

  $today = new DateTime();
  $today->setTime(0, 0, 0); 
  $thirtyDaysFromNow = (new DateTime())->modify('+30 days');

  foreach($inventory as $item) {
    $stock = (int)$item['stock_level'];
    $minStock = (int)$item['min_stock_level'];
    $isActive = (int)$item['is_active'] === 1; 
    
    $isExpired = false;

    // check expiry
    if(!empty($item['expiry_date'])) {
      $expiry = new DateTime($item['expiry_date']);
      $expiry->setTime(0, 0, 0);

      if($expiry < $today) {
        $cardData['expired_items']++;
        // mark as expired 
        $isExpired = true; 
      } elseif($isActive && $expiry <= $thirtyDaysFromNow) { 
        $cardData['expiring_soon']++; 
      }
    }

    // only count active and stocks if they are not archived or expired 
    if($isActive) {
      $cardData['active_products']++; 
      if(!$isExpired) {
        if($stock <= 0) {
          $cardData['out_of_stock']++; 
        } elseif($stock <= $minStock) {
          $cardData['low_stock']++; 
        }
      }
    }
  }

  echo json_encode([
    "success" => true, 
    "data" => $inventory,
    "cardData" => $cardData
  ]);

} catch(Exception $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false, 
    "message" => "Database error: " . $e->getMessage()
  ]);
}