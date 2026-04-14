<?php
error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED);
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

require_once __DIR__ . '/../../../../vendor/autoload.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';

use Xendit\Configuration;
use Xendit\Invoice\InvoiceApi;
use Xendit\Invoice\CreateInvoiceRequest;

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../../../');
$dotenv->load();

$user = validate_auth(['clinic_admin', 'branch_admin']); 

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents('php://input'));
  $is_from_settings = (isset($data->is_resubscribe) && $data->is_resubscribe) ? 'true' : 'false';

  // 1. Get the method from frontend (e.g., 'CARD', 'GCASH', 'PAYMAYA')
  $method_input = strtoupper((string)($data->payment_method ?? 'GCASH'));
  
  // 2. Map it to Xendit's exact required naming conventions
  $xendit_method = $method_input;
  if ($method_input === 'CARD') {
    $xendit_method = 'CREDIT_CARD';
  }

  Configuration::setXenditKey($_ENV['XENDIT_SECRET_KEY']);
  $apiInstance = new InvoiceApi();

  $external_id = 'sub_' . time() . '_' . $data->branch_id;
  $base_url = rtrim($_ENV['MAIN_URL'], '/'); 

  $success_url = $base_url . "/payment-success?branch_id={$data->branch_id}&sub_id={$data->subscription_id}&amount={$data->amount}&from_settings={$is_from_settings}";
  $failure_url = $base_url . "/clinic/{$data->branch_id}/select-plan?status=cancelled";

  $create_invoice_request = new CreateInvoiceRequest([
    'external_id' => $external_id,
    'amount' => (float)$data->amount,
    'currency' => 'PHP',
    'description' => "Subscription: " . $data->plan_name,
    // 3. Pass the mapped method to Xendit
    'payment_methods' => [$xendit_method],
    'success_redirect_url' => $success_url,
    'failure_redirect_url' => $failure_url,
    'invoice_duration' => 900 
  ]);

  $result = $apiInstance->createInvoice($create_invoice_request);

  // 4. Save the intention in the database as 'pending'
  $stmt = $pdo->prepare(
    "INSERT INTO payments_tb (
      branch_id, subscription_id, payment_type, payment_method, 
      xendit_invoice_id, external_id, amount, payment_status
    ) VALUES (:branch_id, :sub_id, 'subscription', :method, :x_id, :ext_id, :amt, 'pending')"
  );

  $stmt->execute([
    ":branch_id" => $data->branch_id,
    ":sub_id" => $data->subscription_id,
    ":method" => $xendit_method, // Stores 'CREDIT_CARD', 'GCASH', or 'PAYMAYA'
    ":x_id" => $result['id'],
    ":ext_id" => $external_id,
    ":amt" => $data->amount
  ]);

  log_audit(
    $pdo, 
    $user->user_id, 
    0,
    $data->branch_id, 
    'CREATE', 
    'PAYMENT_INTENT', 
    $data->subscription_id
  );

  echo json_encode(["success" => true, "checkout_url" => $result['invoice_url']]);
} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}