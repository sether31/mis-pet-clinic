<?php
ob_clean();
error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED);
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../vendor/autoload.php';

use Xendit\Configuration;
use Xendit\Invoice\InvoiceApi;
use Xendit\Invoice\CreateInvoiceRequest;

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../../');
$dotenv->load();

$decoded = validate_auth(['pet_owner']);

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents('php://input'));

  if (!isset($data->appointment_id)) {
    throw new Exception("Missing appointment ID.");
  }

  // 💥 NEW: Read the payment method selected from the Mobile App
  $method_input = $data->payment_method ?? 'GCASH';
  $selectedMethod = strtoupper((string)$method_input);

  // 1. Get the order_id linked to this appointment
  $stmtAppt = $pdo->prepare("SELECT order_id FROM appointments_tb WHERE appointment_id = ?");
  $stmtAppt->execute([$data->appointment_id]);
  $appt = $stmtAppt->fetch();

  if (!$appt || !$appt['order_id']) {
    throw new Exception("No billing order linked to this appointment.");
  }

  $order_id = $appt['order_id'];

  // 2. Find the unpaid bill in payments_tb using the order_id
  $stmtPay = $pdo->prepare("SELECT * FROM payments_tb WHERE order_id = ? AND payment_type = 'appointment' LIMIT 1");
  $stmtPay->execute([$order_id]);
  $payment = $stmtPay->fetch();

  if (!$payment) {
    throw new Exception("No billing record found for this order.");
  }

  if ($payment['payment_status'] === 'paid') {
    echo json_encode(["success" => false, "message" => "This bill is already paid."]);
    exit;
  }

  Configuration::setXenditKey($_ENV['XENDIT_SECRET_KEY']);
  $apiInstance = new InvoiceApi();

  // 3. SMART CHECK: If invoice exists AND they picked the same method, just get the URL from Xendit!
  if (!empty($payment['xendit_invoice_id']) && $payment['payment_method'] === $selectedMethod) {
    try {
      $existingInvoice = $apiInstance->getInvoiceById($payment['xendit_invoice_id']);
      if ($existingInvoice['status'] === 'PENDING') {
        echo json_encode(["success" => true, "checkout_url" => $existingInvoice['invoice_url']]);
        exit;
      }
    } catch (Exception $e) {
      // Invoice expired or not found, proceed to create a new one below
    }
  }

  // 4. Create a fresh invoice locked to the specific payment method
  $external_id = 'appt_' . time() . '_' . $payment['payment_id'];
  $return_url = $data->return_url ?? 'https://google.com'; 

  $create_invoice_request = new CreateInvoiceRequest([
    'external_id' => $external_id,
    'amount' => (float)$payment['amount'],
    'currency' => 'PHP',
    'description' => "Clinic Appointment Payment #" . $data->appointment_id,
    'payment_methods' => [$selectedMethod], 
    'success_redirect_url' => $return_url, 
    'failure_redirect_url' => $return_url, 
    'invoice_duration' => 86400 
  ]);

  $result = $apiInstance->createInvoice($create_invoice_request);

  // 5. Update DB (Note: No xendit_invoice_url column here, perfectly matching your DB schema)
  $update = $pdo->prepare("UPDATE payments_tb SET xendit_invoice_id = ?, external_id = ?, payment_method = ? WHERE payment_id = ?");
  $update->execute([$result['id'], $external_id, $selectedMethod, $payment['payment_id']]);

  // Send the fresh URL back to React Native to open in Expo Web Browser
  echo json_encode(["success" => true, "checkout_url" => $result['invoice_url']]);

} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>