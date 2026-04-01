<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';

$decodedToken = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$adminId = $decodedToken->user_id;

$branchId = $_POST['branch_id'] ?? null;
$productIdFromPost = $_POST['product_id'] ?? null; 
// 👇 NEW: Grab the inventory ID so we know EXACTLY which row to update
$inventoryIdFromPost = $_POST['inventory_id'] ?? null; 
if ($inventoryIdFromPost === 'null') $inventoryIdFromPost = null;

$name = trim($_POST['name'] ?? '');
$description = trim($_POST['description'] ?? '');
$price = $_POST['price'] ?? 0;
$category = $_POST['category'] ?? 'Medication';
$stockLevel = (int)($_POST['stock_level'] ?? 0); 
$unitCost = $_POST['unit_cost'] ?? 0;
$minStock = $_POST['min_stock_level'] ?? 5;
$supplierName = trim($_POST['supplier_name'] ?? '');
$supplierContact = trim($_POST['supplier_contact'] ?? '');

$expiryDate = !empty($_POST['expiry_date']) ? $_POST['expiry_date'] : null;

if ($category === 'Accessories') {
  $expiryDate = null; // Enforce null in the database
}

// 👇 NEW: Update validation to allow empty expiry if it's an Accessory
if(!$branchId || !$name || !$price || !$unitCost || ($category !== 'Accessories' && !$expiryDate)) {
  echo json_encode(["success" => false, "message" => "All required fields must be filled."]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  // 1. Verify Authorization
  $stmt = $pdo->prepare(
    "SELECT c.clinic_id, b.branch_id FROM clinic_branches_tb b
    JOIN clinics_tb c ON b.clinic_id = c.clinic_id
    LEFT JOIN branch_staff_tb s ON b.branch_id = s.branch_id AND s.user_id = ?
    WHERE b.branch_id = ? AND (c.created_by = ? OR s.user_id IS NOT NULL)"
  );
  $stmt->execute([$adminId, $branchId, $adminId]);
  $branchData = $stmt->fetch();

  if(!$branchData) {
    echo json_encode(["success" => false, "message" => "Unauthorized access to this branch."]);
    exit;
  }
  $clinicId = $branchData['clinic_id'];

  // 2. Handle Product (Find or Create)
  if ($productIdFromPost && $productIdFromPost !== 'null') {
    $stmtProd = $pdo->prepare("SELECT product_id, prod_pic FROM products_tb WHERE product_id = ? AND branch_id = ? LIMIT 1");
    $stmtProd->execute([$productIdFromPost, $branchId]);
  } else {
    $stmtProd = $pdo->prepare("SELECT product_id, prod_pic FROM products_tb WHERE name = ? AND branch_id = ? LIMIT 1");
    $stmtProd->execute([$name, $branchId]);
  }
  
  $existingProduct = $stmtProd->fetch();
  $dbImagePath = null;
  $productId = null;

  if($existingProduct) {
    $productId = $existingProduct['product_id'];
    $dbImagePath = $existingProduct['prod_pic'];

    if(isset($_FILES['prod_pic']) && $_FILES['prod_pic']['error'] === UPLOAD_ERR_OK) {
      $oldFile = dirname(__DIR__, 4) . "/" . $existingProduct['prod_pic'];
      if($existingProduct['prod_pic'] && file_exists($oldFile)) unlink($oldFile);

      $physicalBaseDir = dirname(__DIR__, 4) . "/uploads/clinic/" . $branchId . "/products/";
      $dbBaseDir = "uploads/clinic/" . $branchId . "/products/";
      if(!is_dir($physicalBaseDir)) mkdir($physicalBaseDir, 0777, true);
      
      $ext = pathinfo($_FILES['prod_pic']['name'], PATHINFO_EXTENSION);
      $fileName = "prod_" . uniqid() . "." . $ext;
      if(move_uploaded_file($_FILES['prod_pic']['tmp_name'], $physicalBaseDir . $fileName)) $dbImagePath = $dbBaseDir . $fileName;
    }

    $updateProd = $pdo->prepare("UPDATE products_tb SET name = ?, description = ?, category = ?, prod_pic = ? WHERE product_id = ?");
    $updateProd->execute([$name, $description, $category, $dbImagePath, $productId]);
  } else {
    // New Product Logic
    if(isset($_FILES['prod_pic']) && $_FILES['prod_pic']['error'] === UPLOAD_ERR_OK) {
      $physicalBaseDir = dirname(__DIR__, 4) . "/uploads/clinic/" . $branchId . "/products/";
      $dbBaseDir = "uploads/clinic/" . $branchId . "/products/";
      if(!is_dir($physicalBaseDir)) mkdir($physicalBaseDir, 0777, true);
      $ext = pathinfo($_FILES['prod_pic']['name'], PATHINFO_EXTENSION);
      $fileName = "prod_" . uniqid() . "." . $ext;
      if(move_uploaded_file($_FILES['prod_pic']['tmp_name'], $physicalBaseDir . $fileName)) $dbImagePath = $dbBaseDir . $fileName;
    }
    if(!$dbImagePath) { echo json_encode(["success" => false, "message" => "Image required for new items."]); exit; }

    $stmtProdInsert = $pdo->prepare("INSERT INTO products_tb (branch_id, name, description, category, prod_pic) VALUES (?, ?, ?, ?, ?)");
    $stmtProdInsert->execute([$branchId, $name, $description, $category, $dbImagePath]);
    $productId = $pdo->lastInsertId();
  }

  // 👇 FIX: Update or Insert Inventory based strictly on inventory_id!
  if ($inventoryIdFromPost) {
    // UPDATE EXISTING (No matter what you changed, including the date)
    $updateInv = $pdo->prepare(
      "UPDATE inventory_tb 
       SET stock_level = ?, unit_cost = ?, price = ?, min_stock_level = ?, expiry_date = ?, supplier_name = ?, supplier_contact = ?, last_updated_by = ?, updated_at = NOW() 
       WHERE inventory_id = ?"
    );
    $updateInv->execute([$stockLevel, $unitCost, $price, $minStock, $expiryDate, $supplierName, $supplierContact, $adminId, $inventoryIdFromPost]);
    
    log_audit($pdo, $adminId, $clinicId, $branchId, 'UPDATE', 'INVENTORY_STOCK_ADJUST', $productId);
  } else {
    // INSERT BRAND NEW
    $stmtInvInsert = $pdo->prepare(
      "INSERT INTO inventory_tb (product_id, branch_id, stock_level, unit_cost, price, min_stock_level, expiry_date, supplier_name, supplier_contact, last_updated_by, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())"
    );
    $stmtInvInsert->execute([$productId, $branchId, $stockLevel, $unitCost, $price, $minStock, $expiryDate, $supplierName, $supplierContact, $adminId]);
  }

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Inventory updated successfully."]);
} catch(Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>