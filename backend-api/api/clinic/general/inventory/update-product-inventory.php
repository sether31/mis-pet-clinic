<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';

$decodedToken = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$adminId = $decodedToken->user_id;

$branchId = $_POST['branch_id'] ?? null;
$name = trim($_POST['name'] ?? '');
$description = trim($_POST['description'] ?? '');
$price = $_POST['price'] ?? 0;
$category = $_POST['category'] ?? 'Medication';
$stockLevel = (int)($_POST['stock_level'] ?? 0); // This is already the FINAL TOTAL from React
$unitCost = $_POST['unit_cost'] ?? 0;
$minStock = $_POST['min_stock_level'] ?? 5;
$expiryDate = $_POST['expiry_date'] ?? null;
$supplierName = trim($_POST['supplier_name'] ?? '');
$supplierContact = trim($_POST['supplier_contact'] ?? '');

if(!$branchId || !$name || !$price || !$unitCost || !$expiryDate) {
  echo json_encode(["success" => false, "message" => "All required fields must be filled."]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

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

  $stmtProd = $pdo->prepare("SELECT product_id, prod_pic FROM products_tb WHERE name = ? AND branch_id = ? LIMIT 1");
  $stmtProd->execute([$name, $branchId]);
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

    $updateProd = $pdo->prepare("UPDATE products_tb SET description = ?, prod_pic = ? WHERE product_id = ?");
    $updateProd->execute([$description, $dbImagePath, $productId]);

    $stmtInv = $pdo->prepare("SELECT inventory_id, stock_level FROM inventory_tb WHERE product_id = ? AND expiry_date = ? LIMIT 1");
    $stmtInv->execute([$productId, $expiryDate]);
    $existingBatch = $stmtInv->fetch();

    if($existingBatch) {
      // 👇 FIX: TRUST THE STOCK LEVEL FROM REACT (NO EXTRA MATH) 👇
      $newTotal = $stockLevel; 
      
      $updateInv = $pdo->prepare(
        "UPDATE inventory_tb 
         SET stock_level = ?, unit_cost = ?, price = ?, supplier_name = ?, supplier_contact = ?, last_updated_by = ?, updated_at = NOW() 
         WHERE inventory_id = ?"
      );
      $updateInv->execute([$newTotal, $unitCost, $price, $supplierName, $supplierContact, $adminId, $existingBatch['inventory_id']]);

      log_audit($pdo, $adminId, $clinicId, $branchId, 'UPDATE', 'INVENTORY_STOCK_ADJUST', $productId);

      $pdo->commit();
      echo json_encode(["success" => true, "message" => "Inventory updated successfully."]);
      exit; // IMPORTANT: Exit here
    }
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

  // Create new inventory batch
  $stmtInvInsert = $pdo->prepare(
    "INSERT INTO inventory_tb (product_id, branch_id, stock_level, unit_cost, price, min_stock_level, expiry_date, supplier_name, supplier_contact, last_updated_by, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())"
  );
  $stmtInvInsert->execute([$productId, $branchId, $stockLevel, $unitCost, $price, $minStock, $expiryDate, $supplierName, $supplierContact, $adminId]);

  // log_audit($pdo, $adminId, $clinicId, $branchId, 'CREATE', 'INVENTORY_NEW_PRODUCT', $productId);

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Inventory updated successfully."]);
} catch(Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>