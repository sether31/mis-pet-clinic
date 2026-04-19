<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';

$decodedToken = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$adminId = $decodedToken->user_id;

$branchId = $_POST['branch_id'] ?? null;
$name = trim($_POST['name'] ?? '');
$category = $_POST['category'] ?? 'Medication';
$brandType = $_POST['brand_type'] ?? 'N/A';
$brandName = trim($_POST['brand_name'] ?? '');

// FIX: Ensure dosage is treated as a string to keep mg/ml/g
$dosage = trim((string)($_POST['dosage'] ?? '')); 

$description = trim($_POST['description'] ?? '');
$price = $_POST['price'] ?? 0;
$stockLevel = (int)($_POST['stock_level'] ?? 0);
$unitCost = $_POST['unit_cost'] ?? 0;
$minStock = $_POST['min_stock_level'] ?? 5;
$supplierName = trim($_POST['supplier_name'] ?? '');
$supplierContact = trim($_POST['supplier_contact'] ?? '');
$expiryDate = !empty($_POST['expiry_date']) ? $_POST['expiry_date'] : null;

if ($category === 'Accessories') { $expiryDate = null; }
if ($category !== 'Medication' && $category !== 'Supplies') { $brandType = 'N/A'; }

// Validation: Note that $dosage is now checked as a string
if(!$branchId || !$name || !$brandName || !$price || !$unitCost || ($category === 'Medication' && $dosage === '') || ($category !== 'Accessories' && !$expiryDate)) {
  echo json_encode(["success" => false, "message" => "All required fields must be filled."]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  $stmt = $pdo->prepare("SELECT c.clinic_id FROM clinic_branches_tb b JOIN clinics_tb c ON b.clinic_id = c.clinic_id WHERE b.branch_id = ?");
  $stmt->execute([$branchId]);
  $branchData = $stmt->fetch();
  if(!$branchData) { echo json_encode(["success" => false, "message" => "Invalid branch."]); exit; }
  $clinicId = $branchData['clinic_id'];

  // This check is now robust for strings like "500mg" vs "500ml"
  $stmtProd = $pdo->prepare(
      "SELECT product_id, prod_pic FROM products_tb 
        WHERE name = ? 
        AND brand_name = ? 
        AND dosage = ? 
        AND branch_id = ? 
        LIMIT 1"
  );
  $stmtProd->execute([$name, $brandName, $dosage, $branchId]);
  $existingProduct = $stmtProd->fetch();

  $dbImagePath = null;
  $productId = null;

  if($existingProduct) {
      $productId = $existingProduct['product_id'];
      $dbImagePath = $existingProduct['prod_pic'];

      if(isset($_FILES['prod_pic']) && $_FILES['prod_pic']['error'] === UPLOAD_ERR_OK) {
          $physicalBaseDir = dirname(__DIR__, 4) . "/uploads/clinic/" . $branchId . "/products/";
          if(!is_dir($physicalBaseDir)) mkdir($physicalBaseDir, 0777, true);
          $ext = pathinfo($_FILES['prod_pic']['name'], PATHINFO_EXTENSION);
          $fileName = "prod_" . uniqid() . "." . $ext;
          if(move_uploaded_file($_FILES['prod_pic']['tmp_name'], $physicalBaseDir . $fileName)) {
              $dbImagePath = "uploads/clinic/" . $branchId . "/products/" . $fileName;
          }
      }

      $updateProd = $pdo->prepare("UPDATE products_tb SET description = ?, prod_pic = ?, category = ?, brand_type = ? WHERE product_id = ?");
      $updateProd->execute([$description, $dbImagePath, $category, $brandType, $productId]);

      $stmtInv = $pdo->prepare("SELECT inventory_id, stock_level FROM inventory_tb WHERE product_id = ? AND expiry_date <=> ? LIMIT 1");
      $stmtInv->execute([$productId, $expiryDate]);
      $existingBatch = $stmtInv->fetch();

      if($existingBatch) {
          $newTotal = $existingBatch['stock_level'] + $stockLevel;
          $updateInv = $pdo->prepare("UPDATE inventory_tb SET stock_level = ?, unit_cost = ?, price = ?, supplier_name = ?, supplier_contact = ?, last_updated_by = ?, updated_at = NOW() WHERE inventory_id = ?");
          $updateInv->execute([$newTotal, $unitCost, $price, $supplierName, $supplierContact, $adminId, $existingBatch['inventory_id']]);
          
          $pdo->commit();
          echo json_encode(["success" => true, "message" => "Stock merged into existing batch."]);
          exit;
      }
  } else {
      if(isset($_FILES['prod_pic']) && $_FILES['prod_pic']['error'] === UPLOAD_ERR_OK) {
          $physicalBaseDir = dirname(__DIR__, 4) . "/uploads/clinic/" . $branchId . "/products/";
          if(!is_dir($physicalBaseDir)) mkdir($physicalBaseDir, 0777, true);
          $ext = pathinfo($_FILES['prod_pic']['name'], PATHINFO_EXTENSION);
          $fileName = "prod_" . uniqid() . "." . $ext;
          if(move_uploaded_file($_FILES['prod_pic']['tmp_name'], $physicalBaseDir . $fileName)) {
              $dbImagePath = "uploads/clinic/" . $branchId . "/products/" . $fileName;
          }
      }
      if(!$dbImagePath) { echo json_encode(["success" => false, "message" => "Image required for new products."]); exit; }

      $stmtProdInsert = $pdo->prepare("INSERT INTO products_tb (branch_id, name, description, category, prod_pic, brand_type, brand_name, dosage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      $stmtProdInsert->execute([$branchId, $name, $description, $category, $dbImagePath, $brandType, $brandName, $dosage]);
      $productId = $pdo->lastInsertId();
  }

  $stmtInvInsert = $pdo->prepare("INSERT INTO inventory_tb (product_id, branch_id, stock_level, unit_cost, price, min_stock_level, expiry_date, supplier_name, supplier_contact, last_updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
  $stmtInvInsert->execute([$productId, $branchId, $stockLevel, $unitCost, $price, $minStock, $expiryDate, $supplierName, $supplierContact, $adminId]);

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Inventory added successfully."]);

} catch(Exception $e) {
  if (isset($pdo)) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>