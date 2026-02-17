<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';

$decodedToken = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);  
$adminId = $decodedToken->user_id;

$productId = $_POST['product_id'] ?? null;
$inventoryId = $_POST['inventory_id'] ?? null;
$branchId = $_POST['branch_id'] ?? null;

$name = trim($_POST['name'] ?? '');
$description = trim($_POST['description'] ?? '');
$price = $_POST['price'] ?? 0; 
$category = $_POST['category'] ?? 'Medication';
$stockLevel = (int)($_POST['stock_level'] ?? 0);
$unitCost = $_POST['unit_cost'] ?? 0;
$minStock = $_POST['min_stock_level'] ?? 5;
$expiryDate = $_POST['expiry_date'] ?? null;
$supplierName = trim($_POST['supplier_name'] ?? '');
$supplierContact = trim($_POST['supplier_contact'] ?? '');

if(!$productId || !$inventoryId || !$branchId || !$name) {
  echo json_encode(["success" => false, "message" => "Missing required identifiers or product name."]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  $stmtVerify = $pdo->prepare(
    "SELECT c.clinic_id, p.product_id, p.prod_pic 
    FROM products_tb p
    JOIN clinic_branches_tb b ON p.branch_id = b.branch_id
    JOIN clinics_tb c ON b.clinic_id = c.clinic_id
    LEFT JOIN branch_staff_tb s ON b.branch_id = s.branch_id AND s.user_id = ?
    WHERE p.product_id = ? AND p.branch_id = ? 
    AND (c.created_by = ? OR s.user_id IS NOT NULL)"
  );
  $stmtVerify->execute([$adminId, $productId, $branchId, $adminId]);
  $currentProduct = $stmtVerify->fetch();

  if(!$currentProduct) {
    echo json_encode(["success" => false, "message" => "Product not found or unauthorized access."]);
    exit;
  }

  $clinicId = $currentProduct['clinic_id'];

  // handle image
  $dbImagePath = $currentProduct['prod_pic']; 

  if(isset($_FILES['prod_pic']) && $_FILES['prod_pic']['error'] === UPLOAD_ERR_OK) {
    $oldPhysicalPath = dirname(__DIR__, 4) . "/" . $currentProduct['prod_pic'];
    if($currentProduct['prod_pic'] && file_exists($oldPhysicalPath)) {
      unlink($oldPhysicalPath);
    }

    $physicalBaseDir = dirname(__DIR__, 4) . "/uploads/clinic/" . $branchId . "/products/";
    $dbBaseDir = "uploads/clinic/" . $branchId . "/products/";
    if(!is_dir($physicalBaseDir)) mkdir($physicalBaseDir, 0777, true);

    $ext = pathinfo($_FILES['prod_pic']['name'], PATHINFO_EXTENSION);
    $fileName = "prod_" . uniqid() . "." . $ext;
    
    if(move_uploaded_file($_FILES['prod_pic']['tmp_name'], $physicalBaseDir . $fileName)) {
      $dbImagePath = $dbBaseDir . $fileName;
    }
  }

  $stmtUpdateProd = $pdo->prepare(
    "UPDATE products_tb 
    SET name = ?, description = ?, category = ?, prod_pic = ? 
    WHERE product_id = ?"
  );
  $stmtUpdateProd->execute([$name, $description, $category, $dbImagePath, $productId]);


  $stmtUpdateInv = $pdo->prepare(
    "UPDATE inventory_tb 
    SET stock_level = ?, unit_cost = ?, price = ?, min_stock_level = ?, 
      expiry_date = ?, supplier_name = ?, supplier_contact = ?
    WHERE inventory_id = ? AND product_id = ?"
  );
  $stmtUpdateInv->execute([
    $stockLevel, 
    $unitCost, 
    $price, 
    $minStock, 
    $expiryDate, 
    $supplierName, 
    $supplierContact, 
    $inventoryId, 
    $productId
  ]);


  // audit update inventory
  log_audit(
    $pdo, 
    $adminId, 
    $clinicId, 
    $branchId, 
    'UPDATE', 
    'INVENTORY_DETAILS', 
    $productId
  );

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Inventory item updated successfully."]);

} catch (Exception $e) {
  if (isset($pdo)) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}