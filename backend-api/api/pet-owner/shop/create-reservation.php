<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../helper/log_audit.php';

$decoded = validate_auth(['pet_owner']); 

try {
  $pdo = (new Database())->pdo;
  $userId = $decoded->user_id;

  $data = json_decode(file_get_contents("php://input"));
  
  if (!$data || !isset($data->product_id) || !isset($data->branch_id) || !isset($data->quantity) || !isset($data->pickup_date)) {
    throw new Exception("Incomplete reservation data.");
  }

  $productId = $data->product_id;
  $branchId = $data->branch_id;
  $reqQty = (int)$data->quantity;
  $pickupDate = $data->pickup_date; 

  // Stop the checkout if clinic expired 
  $checkStmt = $pdo->prepare(
    "SELECT 
      cb.is_maintenance, 
      cb.status, 
      (SELECT COUNT(*) FROM branch_subscriptions_tb bs 
        WHERE bs.branch_id = cb.branch_id 
          AND LOWER(bs.status) = 'active' 
          AND bs.end_date >= CURDATE()
      ) as has_sub,
      (SELECT sub.has_shop FROM branch_subscriptions_tb bs 
        JOIN subscription_tb sub ON bs.subscription_id = sub.subscription_id
        WHERE bs.branch_id = cb.branch_id 
          AND LOWER(bs.status) = 'active' 
          AND bs.end_date >= CURDATE()
        LIMIT 1
      ) as has_shop
    FROM clinic_branches_tb cb 
    WHERE cb.branch_id = ?"
  );
  $checkStmt->execute([$branchId]);
  $clinicCheck = $checkStmt->fetch();

  // If clinic is closed, maintenance, expired, OR no longer has shop access
  if (!$clinicCheck || 
    $clinicCheck['is_maintenance'] == 1 || 
    strtolower($clinicCheck['status']) !== 'approved' || 
    $clinicCheck['has_sub'] == 0 ||
    $clinicCheck['has_shop'] == 0
  ) {
    throw new Exception("This clinic's shop is currently under maintenance or unavailable.");
  }

  // CHECK IF DAY IS CLOSED 
  $dayOfWeek = strtolower(date('l', strtotime($pickupDate)));
  
  $stmtCheckDay = $pdo->prepare("SELECT is_closed FROM branch_operating_hours_tb WHERE branch_id = :bid AND LOWER(day_of_week) = :dow");
  $stmtCheckDay->execute([':bid' => $branchId, ':dow' => $dayOfWeek]);
  $dayConfig = $stmtCheckDay->fetch();

  if($dayConfig && ($dayConfig['is_closed'] == 1 || $dayConfig['is_closed'] === '1')) {
    throw new Exception("The clinic is closed on your selected date. Please go back and choose another day.");
  }

  // START TRANSACTION
  $pdo->beginTransaction();

  // Only lock and check the FIRST available batch!
  $stmtInv = $pdo->prepare(
    "SELECT inventory_id, stock_level, price 
    FROM inventory_tb 
    WHERE product_id = :pid AND branch_id = :bid 
      AND stock_level > 0 
      AND (expiry_date >= CURDATE() OR expiry_date IS NULL)
    ORDER BY expiry_date IS NULL ASC, expiry_date ASC
    LIMIT 1
    FOR UPDATE"
  );
  $stmtInv->execute([':pid' => $productId, ':bid' => $branchId]);
  $inventoryBatch = $stmtInv->fetch();

  // If there is no batch, or the user asks for more than this specific batch holds
  if(!$inventoryBatch || $reqQty > $inventoryBatch['stock_level']) {
    throw new Exception("Stock level changed during checkout. Please refresh the product page.");
  }

  // Calculate Price strictly off this single batch
  $unitPrice = $inventoryBatch['price'];
  $totalPrice = $reqQty * $unitPrice;

  // Deduct Stock
  $newStock = $inventoryBatch['stock_level'] - $reqQty;
  $updateInvStmt = $pdo->prepare("UPDATE inventory_tb SET stock_level = :new_stock WHERE inventory_id = :inv_id");
  $updateInvStmt->execute([
    ':new_stock' => $newStock, 
    ':inv_id' => $inventoryBatch['inventory_id']
  ]);

  // Create the Main Order Record
  $stmtOrder = $pdo->prepare(
    "INSERT INTO order_tb (user_id, branch_id, total_amount, pickup_date, order_status, created_at)
    VALUES (:uid, :bid, :total, :pdate, 'pending', NOW())"
  );
  $stmtOrder->execute([
    ':uid' => $userId,
    ':bid' => $branchId,
    ':total' => $totalPrice,
    ':pdate' => $pickupDate
  ]);
  
  $orderId = $pdo->lastInsertId();

  // Create the Order Items Record
  $stmtItem = $pdo->prepare(
    "INSERT INTO order_items_tb (order_id, inventory_id, product_id, quantity, price, subtotal)
    VALUES (:oid, :inv_id, :pid, :qty, :price, :subtotal)"
  );
  $stmtItem->execute([
    ':oid' => $orderId,
    ':inv_id' => $inventoryBatch['inventory_id'],
    ':pid' => $productId,
    ':qty' => $reqQty,
    ':price' => $unitPrice,
    ':subtotal' => $totalPrice
  ]);

  // Create the Pending Payment Record
  $stmtPayment = $pdo->prepare(
    "INSERT INTO payments_tb (
      branch_id, 
      order_id, 
      payment_type, 
      amount, 
      payment_status
    ) VALUES (
      :bid, 
      :oid, 
      'product', 
      :amount, 
      'pending'
    )"
  );
  $stmtPayment->execute([
    ':bid' => $branchId,
    ':oid' => $orderId,
    ':amount' => $totalPrice
  ]);
  
  // audit
  log_audit($pdo, $userId, null, $branchId, 'CREATE', 'RESERVATION', $orderId);

  $pdo->commit();

  echo json_encode([
    "success" => true, 
    "message" => "Reservation successful!", 
    "order_id" => $orderId
  ]);

} catch(Throwable $e) {
  if(isset($pdo) && $pdo->inTransaction()) {
    $pdo->rollBack();
  }
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>