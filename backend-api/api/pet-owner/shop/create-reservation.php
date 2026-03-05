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

  // STALE DATA VALIDATION
  $dayOfWeek = strtolower(date('l', strtotime($pickupDate)));
  
  $stmtCheckDay = $pdo->prepare("SELECT is_closed FROM branch_operating_hours_tb WHERE branch_id = :bid AND LOWER(day_of_week) = :dow");
  $stmtCheckDay->execute([':bid' => $branchId, ':dow' => $dayOfWeek]);
  $dayConfig = $stmtCheckDay->fetch();

  if($dayConfig && ($dayConfig['is_closed'] == 1 || $dayConfig['is_closed'] === '1')) {
    throw new Exception("The clinic is closed on your selected date. Please go back and choose another day.");
  }

  // START TRANSACTION
  $pdo->beginTransaction();

  // FEFO LOGIC
  $stmtInv = $pdo->prepare(
    "SELECT inventory_id, stock_level, price 
    FROM inventory_tb 
    WHERE product_id = :pid AND branch_id = :bid 
      AND stock_level > 0 
      AND (expiry_date >= CURDATE() OR expiry_date IS NULL)
    ORDER BY expiry_date ASC
    FOR UPDATE"
  );
  $stmtInv->execute([':pid' => $productId, ':bid' => $branchId]);
  $inventoryRows = $stmtInv->fetchAll();

  $totalAvailable = 0;
  foreach($inventoryRows as $row) {
    $totalAvailable += $row['stock_level'];
  }

  if($reqQty > $totalAvailable) {
    throw new Exception("Sorry, there is not enough stock available.");
  }

  // Deduct Stock & Calculate Price
  $qtyToFulfill = $reqQty;
  $totalPrice = 0;

  $updateInvStmt = $pdo->prepare("UPDATE inventory_tb SET stock_level = :new_stock WHERE inventory_id = :inv_id");

  foreach($inventoryRows as $row) {
    if($qtyToFulfill <= 0) break; 
    
    $take = min($row['stock_level'], $qtyToFulfill);
    $totalPrice += ($take * $row['price']); 
    
    $newStock = $row['stock_level'] - $take;
    $updateInvStmt->execute([
      ':new_stock' => $newStock, 
      ':inv_id' => $row['inventory_id']
    ]);

    $qtyToFulfill -= $take; 
  }

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
  $avgPrice = $totalPrice / $reqQty; 
  $stmtItem = $pdo->prepare(
    "INSERT INTO order_items_tb (order_id, product_id, quantity, price)
    VALUES (:oid, :pid, :qty, :price)"
  );
  $stmtItem->execute([
    ':oid' => $orderId,
    ':pid' => $productId,
    ':qty' => $reqQty,
    ':price' => $avgPrice
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