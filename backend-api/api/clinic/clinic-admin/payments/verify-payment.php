<?php
error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED);
require_once __DIR__ . '/../../../../vendor/autoload.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';

use Xendit\Configuration;
use Xendit\Invoice\InvoiceApi;
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../../../');
$dotenv->load();

validate_auth(['clinic_admin']); 

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents('php://input'));
  $xendit_id = $data->xendit_invoice_id ?? null;

  if(empty($xendit_id)) {
    $stmtFind = $pdo->prepare(
      "SELECT xendit_invoice_id FROM payments_tb 
       WHERE payment_status = 'pending' 
       ORDER BY payment_id DESC LIMIT 1"
    );
    $stmtFind->execute();
    $found = $stmtFind->fetch();
        
    if(!$found) {
      echo json_encode(["success" => true, "message" => "Payment already processed."]);
      exit;
    }
    $xendit_id = $found['xendit_invoice_id'];
  }

  // transaction
  $pdo->beginTransaction();
  $checkProcessed = $pdo->prepare("SELECT payment_status FROM payments_tb WHERE xendit_invoice_id = ? FOR UPDATE");
  $checkProcessed->execute([$xendit_id]);
  $currentStatus = $checkProcessed->fetchColumn();

  // check if paid if yes then go back
  if($currentStatus === 'paid') {
    $pdo->rollBack(); 
    echo json_encode(["success" => true, "message" => "Already verified."]);
    exit;
  }

  // create invoice
  Configuration::setXenditKey($_ENV['XENDIT_SECRET_KEY']);
  $apiInstance = new InvoiceApi();
  $invoice = $apiInstance->getInvoiceById($xendit_id);

  if($invoice['status'] === 'PAID' || $invoice['status'] === 'SETTLED') { 
    // check if gcash or paymaya or ewallet if empty
    $methodUsed = $invoice['payment_channel'] ?? $invoice['payment_method'] ?? 'UNKNOWN';
    $stmt = $pdo->prepare("UPDATE payments_tb SET payment_status = 'paid', payment_method = ? WHERE xendit_invoice_id = ?");
    $stmt->execute([$methodUsed, $xendit_id]);

    // fetch payment details
    $stmtPayInfo = $pdo->prepare("SELECT payment_id, branch_id, subscription_id FROM payments_tb WHERE xendit_invoice_id = ?");
    $stmtPayInfo->execute([$xendit_id]);
    $paymentInfo = $stmtPayInfo->fetch();

    $realPayId = $paymentInfo['payment_id'];
    $realBranchId = $paymentInfo['branch_id'];
    $realSubId = $paymentInfo['subscription_id'] ?? $data->subscription_id; 

    if(empty($realSubId)) {
      throw new Exception("subscription_id is null or missing");
    }

    // get the subscription duration
    $stmtPlan = $pdo->prepare("SELECT duration_months FROM subscription_tb WHERE subscription_id = ? LIMIT 1");
    $stmtPlan->execute([$realSubId]);
    $plan = $stmtPlan->fetch();
    $months = $plan ? (int)$plan['duration_months'] : 1;

    // update subscription
    $stmt2 = $pdo->prepare(
      "INSERT INTO branch_subscriptions_tb (branch_id, subscription_id, payment_id, start_date, end_date, status) 
      VALUES (:branch_id, :sub_id, :pay_id, NOW(), DATE_ADD(NOW(), INTERVAL :sub_length MONTH), 'active')
      ON DUPLICATE KEY UPDATE 
        subscription_id = VALUES(subscription_id), 
        payment_id = VALUES(payment_id),
        end_date = CASE 
          WHEN end_date < NOW() OR status != 'active' THEN DATE_ADD(NOW(), INTERVAL :expiration MONTH)
          ELSE DATE_ADD(end_date, INTERVAL :renewal MONTH)
        END,
        status = 'active'"
    );

    $stmt2->execute([
      ":branch_id" => $realBranchId,
      ":sub_id" => $realSubId,
      ":pay_id" => $realPayId, 
      ":sub_length" => $months,
      ":expiration" => $months,
      ":renewal" => $months
    ]);


    // check if operating hours already exist for this branch
    $checkHours = $pdo->prepare("SELECT COUNT(*) FROM branch_operating_hours_tb WHERE branch_id = ?");
    $checkHours->execute([$realBranchId]);
    $exists = $checkHours->fetchColumn() > 0;

    if(!$exists) {
      $days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      $stmtHours = $pdo->prepare("INSERT INTO branch_operating_hours_tb (branch_id, day_of_week, start_time, end_time, is_closed) VALUES (?, ?, '06:00:00', '20:00:00', ?)");
      
      foreach($days as $day) {
        // set sat and sun closed by default
        $isClosed = ($day === 'Saturday' || $day === 'Sunday') ? 1 : 0;
        $stmtHours->execute([$realBranchId, $day, $isClosed]);
      }
      
      // set to 0
      $stmtFlag = $pdo->prepare("UPDATE clinic_branches_tb SET is_configured = 0 WHERE branch_id = ?");
      $stmtFlag->execute([$realBranchId]);
    }

    $pdo->commit();
    echo json_encode(["success" => true]);
  } else {
    $pdo->rollBack();
    echo json_encode(["success" => false, "message" => "Invoice is " . $invoice['status']]);
  }
} catch(Exception $e) {
  if(isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}