<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

try {
    $pdo = (new Database())->pdo;

    $branch_id = $_GET['branch_id'] ?? null;
    if (!$branch_id) throw new Exception("Branch ID is required.");

    // We JOIN with inventory_tb so we don't show items with 0 stock
    $stmt = $pdo->prepare("
        SELECT 
            p.product_id, 
            p.name, 
            p.price, 
            p.description, 
            p.prod_pic, 
            i.stock_level 
        FROM products_tb p
        JOIN inventory_tb i ON p.product_id = i.product_id
        WHERE i.branch_id = :bid AND i.stock_level > 0
        ORDER BY p.name ASC
    ");
        
    $stmt->execute([':bid' => $branch_id]);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["success" => true, "data" => $products]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}