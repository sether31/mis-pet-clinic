<?php
error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED);
require_once __DIR__ . '/../../../../vendor/autoload.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';

use Xendit\Configuration;
use Xendit\Invoice\InvoiceApi;
use Xendit\Invoice\CreateInvoiceRequest;

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../../../');
$dotenv->load();

$user = validate_auth(['clinic_admin']); 
try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents('php://input'));

  Configuration::setXenditKey($_ENV['XENDIT_SECRET_KEY']);
  $apiInstance = new InvoiceApi();

  // create unique id
  $external_id = 'sub_' . time() . '_' . $data->branch_id;

  // create xendit invoice
  $base_url = rtrim($_ENV['MAIN_URL'], '/'); 

  // make the success and failed url for redirection
  $success_url = $base_url . "/payment-success?branch_id={$data->branch_id}&sub_id={$data->subscription_id}&amount={$data->amount}";
  $failure_url = $base_url . "/{$data->branch_id}/admin/select-plan";

  $create_invoice_request = new CreateInvoiceRequest([
    'external_id' => $external_id,
    'amount' => (float)$data->amount,
    'currency' => 'PHP',
    'description' => "Subscription: " . $data->plan_name,
    'payment_methods' => ['GCASH', 'PAYMAYA'],
    'success_redirect_url' => $success_url,
    'failure_redirect_url' => $failure_url,
  ]);

  $result = $apiInstance->createInvoice($create_invoice_request);

  // save initial pending status record to payments_tb
  $stmt = $pdo->prepare(
    "INSERT INTO payments_tb (
        branch_id, 
        subscription_id,
        payment_type, 
        xendit_invoice_id, 
        external_id, 
        amount, 
        payment_status
    ) 
    VALUES (:branch_id, :subscription_id, :payment_type, :xendit_invoice_id, :external_id, :amount, 'pending')"
  );
  $stmt->execute([
    ":branch_id" => $data->branch_id,  
    ":subscription_id" => $data->subscription_id,            
    ":payment_type" => 'subscription',            
    ":xendit_invoice_id" => $result['id'],             
    ":external_id" => $external_id,              
    ":amount" => $data->amount             
  ]);

  echo json_encode([
    "success" => true, 
    "checkout_url" => $result['invoice_url']
  ]);

} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}