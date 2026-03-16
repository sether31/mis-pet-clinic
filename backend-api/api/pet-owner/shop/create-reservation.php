<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../helper/log_audit.php';
require_once __DIR__ . '/../../../helper/send_notification.php';

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
  $today = date('Y-m-d');

  // check if the clinic is alive before we even look at the dates
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

  // Combined protection check
  if (
    !$clinicCheck || 
    strtolower($clinicCheck['status']) !== 'approved' || 
    $clinicCheck['is_maintenance'] == 1 || 
    $clinicCheck['has_sub'] == 0 || 
    $clinicCheck['has_shop'] == 0
  ) {
    throw new Exception("This clinic is currently under maintenance or unavailable.");
  }

  // Date Validation
  // Prevent selecting a date in the past
  if ($pickupDate < $today) {
    throw new Exception("You cannot select a past date for pickup.");
  }

  // CHECK OPERATING HOURS & CLOSING TIME
  $dayOfWeek = strtolower(date('l', strtotime($pickupDate)));
  
  $stmtCheckDay = $pdo->prepare("SELECT is_closed, end_time FROM branch_operating_hours_tb WHERE branch_id = :bid AND LOWER(day_of_week) = :dow");
  $stmtCheckDay->execute([':bid' => $branchId, ':dow' => $dayOfWeek]);
  $dayConfig = $stmtCheckDay->fetch();

  // Check if closed entirely on that day
  if($dayConfig && ($dayConfig['is_closed'] == 1 || $dayConfig['is_closed'] === '1')) {
    throw new Exception("The clinic is closed on your selected date. Please choose another day.");
  }

  // Check if they are booking for TODAY but the clinic is already closed
  if ($pickupDate === $today && !empty($dayConfig['end_time'])) {
    $currentTime = date('H:i:s');
    $closingTime = $dayConfig['end_time'];

    if ($currentTime >= $closingTime) {
      throw new Exception("The clinic has already closed for today. Please select tomorrow or a later date for your pickup.");
    }
  }

  // STEP 4: START TRANSACTION
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

  // --- SAFE NOTIFICATION LOGIC ---
  // Get Product Name
  $prodStmt = $pdo->prepare("SELECT name FROM products_tb WHERE product_id = ? LIMIT 1");
  $prodStmt->execute([$productId]);
  $prodName = $prodStmt->fetchColumn() ?: 'items';

  // Format Pickup Date
  $formattedDate = date('M j, Y', strtotime($pickupDate));
  
  $notifTitle = "New Shop Reservation";
  $notifMessage = "A new reservation for {$reqQty}x {$prodName} has been placed. Scheduled pickup: {$formattedDate}.";

  $staffStmt = $pdo->prepare("
    SELECT bs.user_id 
    FROM branch_staff_tb bs
    JOIN user_tb u ON bs.user_id = u.user_id
    JOIN roles_tb r ON u.role_id = r.role_id
    WHERE bs.branch_id = ? 
    AND r.role_name IN ('branch_admin', 'staff') 
    AND bs.status = 1
  ");
  $staffStmt->execute([$branchId]);
  
  // Fetch as a standard associative array
  $targetUsers = $staffStmt->fetchAll(PDO::FETCH_ASSOC);

  // Loop and explicitly pull the user_id out of the array
  foreach ($targetUsers as $row) {
    if (!empty($row['user_id'])) {
        send_notification($pdo, $row['user_id'], 'reservation', $notifTitle, $notifMessage);
    }
  }
  // ------------------------------------

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

  $msg = $e->getMessage();
  $isUnavailable = (strpos($msg, 'unavailable') !== false || strpos($msg, 'maintenance') !== false);

  http_response_code(400);
  echo json_encode([
    "success" => false, 
    "message" => $msg,
    "is_unavailable" => $isUnavailable 
  ]);
}
?>