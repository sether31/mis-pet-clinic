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
            i.is_active,
            i.updated_at,
            i.last_updated_by,
            CONCAT(u.first_name, ' ', u.last_name) as updated_by_staff_name
        FROM products_tb p
        INNER JOIN inventory_tb i ON p.product_id = i.product_id
        LEFT JOIN user_tb u ON i.last_updated_by = u.user_id
        WHERE i.branch_id = :branch_id
        ORDER BY i.expiry_date ASC, p.name ASC"
    );
    $stmt->execute([':branch_id' => $branch_id]);
    $inventory = $stmt->fetchAll();

    // 1. Initialize card data
   // 1. Initialize card data
    $cardData = [
        "total_items" => 0,      // This will count EVERYTHING (Active + Archived)
        "active_products" => 0,  // This is for is_active = 1 only
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
        $isActive = ((int)$item['is_active'] === 1);
        
        // RULE: Total items counts every row in the inventory table
        $cardData['total_items']++;

        // If the item is archived, STOP HERE for this item.
        if (!$isActive) {
            continue;
        }

        // --- EVERYTHING BELOW ONLY APPLIES TO ACTIVE ITEMS ---
        $cardData['active_products']++; 
        $isExpired = false;

        // 1. Expiry Logic (Active only)
        if(!empty($item['expiry_date'])) {
            $expiry = new DateTime($item['expiry_date']);
            $expiry->setTime(0, 0, 0);

            if($expiry < $today) {
                $cardData['expired_items']++;
                $isExpired = true; 
            } elseif($expiry <= $thirtyDaysFromNow) { 
                $cardData['expiring_soon']++; 
            }
        }

        // 2. Stock Logic (Active & Not Expired only)
        if(!$isExpired) {
            if($stock <= 0) {
                $cardData['out_of_stock']++; 
            } elseif($stock <= $minStock) {
                $cardData['low_stock']++; 
            }
        }
    }

    // Return the full inventory (including archived) but the filtered cardData
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