<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/send_notification.php';

$user = validate_auth(['branch_admin', 'staff', 'clinic_admin']);
$adminId = $user->user_id;

$data = json_decode(file_get_contents("php://input"), true);
$branchId = $data['branch_id'] ?? null;
$items = $data['items'] ?? [];
$totalAmount = $data['total_amount'] ?? 0;

if (!$branchId || empty($items)) {
  echo json_encode(["success" => false, "message" => "Invalid transaction data."]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  // 1. Create the Order (Guest = user_id is null)
  // 👇 Added updated_at and explicitly passing $adminId to last_updated_by
  $stmtOrder = $pdo->prepare("
      INSERT INTO order_tb (user_id, branch_id, order_status, total_amount, last_updated_by, created_at, updated_at) 
      VALUES (NULL, ?, 'completed', ?, ?, NOW(), NOW())
  ");
  $stmtOrder->execute([$branchId, $totalAmount, $adminId]);
  $orderId = $pdo->lastInsertId();

  // 2. Create the Payment record
  $stmtPay = $pdo->prepare("
      INSERT INTO payments_tb (branch_id, order_id, payment_type, amount, payment_method, payment_status, created_at, updated_at) 
      VALUES (?, ?, 'product_purchase', ?, 'cash', 'paid', NOW(), NOW())
  ");
  $stmtPay->execute([$branchId, $orderId, $totalAmount]);

  // 3. Process Items & Inventory
  $stmtUpdateInv = $pdo->prepare("UPDATE inventory_tb SET stock_level = stock_level - ?, last_updated_by = ?, updated_at = NOW() WHERE inventory_id = ?");
  $stmtItem = $pdo->prepare("INSERT INTO order_items_tb (order_id, inventory_id, product_id, quantity, price, subtotal, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");

  foreach ($items as $item) {
      $qty = (int)$item['qty'];
      $invId = $item['inventory_id'];
      $price = (float)$item['price'];

      // Get product_id
      $stmtGetProd = $pdo->prepare("SELECT product_id FROM inventory_tb WHERE inventory_id = ?");
      $stmtGetProd->execute([$invId]);
      $prodId = $stmtGetProd->fetchColumn();

      $stmtItem->execute([$orderId, $invId, $prodId, $qty, $price, ($qty * $price)]);
      
      // 👇 Also updating last_updated_by for the inventory item being deducted
      $stmtUpdateInv->execute([$qty, $adminId, $invId]);
  }

  // 4. Notify Branch Staff
  $stmtStaff = $pdo->prepare("
    SELECT u.user_id 
    FROM branch_staff_tb bs
    JOIN user_tb u ON bs.user_id = u.user_id
    JOIN roles_tb r ON u.role_id = r.role_id
    WHERE bs.branch_id = ? AND bs.status = 1 AND r.role_name IN ('branch_admin', 'staff')
  ");
  $stmtStaff->execute([$branchId]);
  $staffMembers = $stmtStaff->fetchAll();

  // Extract and format product names
  $itemNames = array_map(function($i) {
      return ucwords(strtolower($i['name']));
  }, $items);

  // Create a clean summary string
  $count = count($itemNames);
  if ($count === 1) {
    $productSummary = $itemNames[0];
  } elseif ($count === 2) {
      $productSummary = $itemNames[0] . " and " . $itemNames[1];
  } else {
    $productSummary = $itemNames[0] . ", " . $itemNames[1] . ", and " . ($count - 2) . " others";
  }

  // Prepare the Final Text
  $staffName = ucwords(trim(($user->fname ?? 'Staff') . " " . ($user->lname ?? '')));

  $notifTitle = "New Guest Purchase";
  $notifMsg = "$staffName just sold $productSummary to a walk-in guest for ₱" . number_format($totalAmount, 2) . ".";

  // Send to recipients (Fixed the variable name from $recipients to $staffMembers)
  foreach ($staffMembers as $recipient) {
    if ($recipient['user_id'] == $adminId) continue;
    send_notification($pdo, $recipient['user_id'], 'reservation', $notifTitle, $notifMsg);
  }

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Guest sale successful."]);

} catch (Exception $e) {
  if (isset($pdo)) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>