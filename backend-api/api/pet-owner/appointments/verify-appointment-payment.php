<?php
ob_clean();
error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED);
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../../helper/log_audit.php';
require_once __DIR__ . '/../../../helper/send_notification.php';

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

  // 1. Get the order_id AND staff_id AND service_name (This is what was missing!)
  $stmtAppt = $pdo->prepare(
    "SELECT a.order_id, a.branch_id, a.staff_id, bs.custom_name, p.name as pet_name 
    FROM appointments_tb a
    LEFT JOIN pet_tb p ON a.pet_id = p.pet_id
    LEFT JOIN branch_service_tb bs ON a.service_id = bs.branch_service_id
    WHERE a.appointment_id = ?"
  );
  $stmtAppt->execute([$data->appointment_id]);
  $appt = $stmtAppt->fetch();
  
  if (!$appt || !$appt['order_id']) throw new Exception("No order found.");

  $order_id = $appt['order_id'];
  $branch_id = $appt['branch_id'];
  $staff_id = $appt['staff_id']; // The Groomer/Vet ID is safely grabbed here
  $pet_name = ucwords($appt['pet_name'] ?: 'your pet');
  $service_name = $appt['custom_name'] ?: 'service';

  // 2. Get the payment record
  $stmtPay = $pdo->prepare("SELECT payment_id, xendit_invoice_id, payment_status, amount FROM payments_tb WHERE order_id = ? AND payment_type = 'appointment' FOR UPDATE");
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

    // 6. Update order table to 'completed'
    $pdo->prepare("UPDATE order_tb SET order_status = 'completed' WHERE order_id = ?")->execute([$order_id]);

    $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinic_branches_tb WHERE branch_id = ?");
    $stmtClinic->execute([$branch_id]);
    $clinicId = $stmtClinic->fetchColumn() ?: 0;

    log_audit(
      $pdo, 
      $decoded->user_id,     
      $clinicId,             
      $branch_id,           
      'PAY',               
      'APPOINTMENT_BILL', 
      $payRecord['payment_id'] 
    );

    // --- 🔔 SMART NOTIFICATION LOGIC ---
    $amountFormatted = number_format($payRecord['amount'], 2);
    $notifTitle = "Online Payment Received";
    $notifMessage = "Online payment of ₱{$amountFormatted} for {$pet_name}'s {$service_name} has been successfully received.";

    $notifyUserIds = []; 

    // A. Fetch active Staff ONLY (Branch Admin successfully removed)
    $staffStmt = $pdo->prepare("
      SELECT bs.user_id 
      FROM branch_staff_tb bs
      JOIN user_tb u ON bs.user_id = u.user_id
      JOIN roles_tb r ON u.role_id = r.role_id
      WHERE bs.branch_id = ? 
      AND r.role_name = 'staff' 
      AND bs.status = 1
    ");
    $staffStmt->execute([$branch_id]);
    $targetUsers = $staffStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($targetUsers as $row) {
      if (!empty($row['user_id'])) {
        $notifyUserIds[] = $row['user_id'];
      }
    }

    // B. Fetch the specific assigned person (Groomer/Vet)
    $vetUserId = null;
    if (!empty($staff_id)) {
        $vetStmt = $pdo->prepare("SELECT user_id FROM branch_staff_tb WHERE staff_id = ? AND status = 1 LIMIT 1");
        $vetStmt->execute([$staff_id]);
        $vetUserId = $vetStmt->fetchColumn();

        // Add them to the list if they aren't already there
        if ($vetUserId && !in_array($vetUserId, $notifyUserIds)) {
            $notifyUserIds[] = $vetUserId; 
        }
    }

    // C. Send the notification to everyone on the combined list
    foreach ($notifyUserIds as $targetId) {
        // The Groomer/Vet gets "Appointment Completed", the Staff gets "Online Payment Settled"
        $finalTitle = ($targetId == $vetUserId) ? "Appointment Completed" : $notifTitle;
        send_notification($pdo, $targetId, 'billing', $finalTitle, $notifMessage);
    }
    // ------------------------------------

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