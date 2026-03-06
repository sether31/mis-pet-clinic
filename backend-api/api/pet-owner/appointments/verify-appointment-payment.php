<?php
ob_clean();
error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED);
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../vendor/autoload.php';

use Xendit\Configuration;
use Xendit\Invoice\InvoiceApi;

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../../');
$dotenv->load();

$decoded = validate_auth(['pet_owner']);

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents('php://input'));

  if (!isset($data->appointment_id)) {
    throw new Exception("Missing appointment ID.");
  }

  $pdo->beginTransaction();

  // 1. Get the order_id
  $stmtAppt = $pdo->prepare("SELECT order_id FROM appointments_tb WHERE appointment_id = ?");
  $stmtAppt->execute([$data->appointment_id]);
  $appt = $stmtAppt->fetch();
  
  if (!$appt || !$appt['order_id']) throw new Exception("No order found.");
  $order_id = $appt['order_id'];

  // 2. Get the payment record
  $stmtPay = $pdo->prepare("SELECT payment_id, xendit_invoice_id, payment_status FROM payments_tb WHERE order_id = ? AND payment_type = 'appointment' FOR UPDATE");
  $stmtPay->execute([$order_id]);
  $payRecord = $stmtPay->fetch();

  if (!$payRecord || empty($payRecord['xendit_invoice_id'])) {
    throw new Exception("Payment record not found or not initialized.");
  }

  // If already marked as paid, exit successfully
  if ($payRecord['payment_status'] === 'paid') {
    $pdo->rollBack();
    echo json_encode(["success" => true, "message" => "Already verified."]);
    exit;
  }

  // 3. Verify with Xendit
  Configuration::setXenditKey($_ENV['XENDIT_SECRET_KEY']);
  $apiInstance = new InvoiceApi();
  $invoice = $apiInstance->getInvoiceById($payRecord['xendit_invoice_id']);

  if ($invoice['status'] === 'PAID' || $invoice['status'] === 'SETTLED') { 
    
    // 4. Update payments table
    $pdo->prepare("UPDATE payments_tb SET payment_status = 'paid' WHERE payment_id = ?")->execute([$payRecord['payment_id']]);

    // 5. Update appointment to 'completed'
    $pdo->prepare("UPDATE appointments_tb SET status = 'completed' WHERE appointment_id = ?")->execute([$data->appointment_id]);

    // 6. Update order table to 'completed' (Keep everything in sync!)
    $pdo->prepare("UPDATE order_tb SET order_status = 'completed' WHERE order_id = ?")->execute([$order_id]);

    $pdo->commit();
    echo json_encode(["success" => true, "message" => "Payment successful!"]);
  } else {
    $pdo->rollBack();
    echo json_encode(["success" => false, "message" => "Payment not completed yet.", "status" => $invoice['status']]);
  }

} catch(Exception $e) {
  if(isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>