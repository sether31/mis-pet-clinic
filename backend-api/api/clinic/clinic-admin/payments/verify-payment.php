<?php
error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED);
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

require_once __DIR__ . '/../../../../vendor/autoload.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';

use Xendit\Configuration;
use Xendit\Invoice\InvoiceApi;
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../../../');
$dotenv->load();

$user = validate_auth(['clinic_admin', 'branch_admin']); 

try {
  $pdo = (new Database())->pdo;
  $data = json_decode(file_get_contents('php://input'));
  $xendit_id = $data->xendit_invoice_id ?? null;

  if(empty($xendit_id)) {
    $stmtFind = $pdo->prepare("SELECT xendit_invoice_id FROM payments_tb WHERE payment_status = 'pending' ORDER BY payment_id DESC LIMIT 1");
    $stmtFind->execute();
    $found = $stmtFind->fetch();
    if(!$found) { echo json_encode(["success" => true, "message" => "Processed."]); exit; }
    $xendit_id = $found['xendit_invoice_id'];
  }

  $pdo->beginTransaction();

  // get payment record
  $stmtPay = $pdo->prepare("SELECT payment_id, branch_id, subscription_id, payment_status FROM payments_tb WHERE xendit_invoice_id = ? FOR UPDATE");
  $stmtPay->execute([$xendit_id]);
  $payRecord = $stmtPay->fetch();

  if(!$payRecord) { throw new Exception("Payment record not found."); }
  
  $realPayId = $payRecord['payment_id']; 

  if($payRecord['payment_status'] === 'paid') {
    $pdo->rollBack(); 
    echo json_encode(["success" => true, "message" => "Already verified."]);
    exit;
  }

  // check exist sub
  $stmtCheckSub = $pdo->prepare("SELECT subscription_id, status, end_date FROM branch_subscriptions_tb WHERE branch_id = ? FOR UPDATE");
  $stmtCheckSub->execute([$payRecord['branch_id']]);
  $existingSub = $stmtCheckSub->fetch();

  // verify with xendit
  Configuration::setXenditKey($_ENV['XENDIT_SECRET_KEY']);
  $apiInstance = new InvoiceApi();
  $invoice = $apiInstance->getInvoiceById($xendit_id);

  if($invoice['status'] === 'PAID' || $invoice['status'] === 'SETTLED') { 
    $realBranchId = $payRecord['branch_id'];
    $newSubId = $payRecord['subscription_id'];

    // determine toast
    $type = 'activation'; 
    if($existingSub) {
      $isActive = ($existingSub['status'] === 'active' && strtotime($existingSub['end_date']) > time());
      if($isActive) {
        $type = ((int)$existingSub['subscription_id'] !== (int)$newSubId) ? 'upgrade' : 'renewal';
      }
    }

    // update payment
    $pdo->prepare("UPDATE payments_tb SET payment_status = 'paid' WHERE xendit_invoice_id = ?")->execute([$xendit_id]);

    $stmtPlan = $pdo->prepare("SELECT duration_months FROM subscription_tb WHERE subscription_id = ? LIMIT 1");
    $stmtPlan->execute([$newSubId]);
    $months = ($plan = $stmtPlan->fetch()) ? (int)$plan['duration_months'] : 1;

    // upsert
    $stmt2 = $pdo->prepare(
      "INSERT INTO branch_subscriptions_tb (branch_id, subscription_id, payment_id, start_date, end_date, status) 
      VALUES (:branch_id, :sub_id, :pay_id, NOW(), DATE_ADD(NOW(), INTERVAL :len1 MONTH), 'active')
      ON DUPLICATE KEY UPDATE 
        subscription_id = VALUES(subscription_id), 
        payment_id = VALUES(payment_id),
        status = 'active',
        end_date = CASE 
          WHEN branch_subscriptions_tb.end_date < NOW() THEN DATE_ADD(NOW(), INTERVAL :len2 MONTH)
          ELSE DATE_ADD(branch_subscriptions_tb.end_date, INTERVAL :len3 MONTH)
        END"
    );

    $stmt2->execute([
      ":branch_id" => $realBranchId, 
      ":sub_id" => $newSubId, 
      ":pay_id" => $realPayId,
      ":len1" => $months,
      ":len2" => $months,
      ":len3" => $months
    ]);


    if($type === 'activation') {
      $stmtCheckBOH = $pdo->prepare("SELECT COUNT(*) FROM branch_operating_hours_tb WHERE branch_id = ?");
      $stmtCheckBOH->execute([$realBranchId]);
      
      if($stmtCheckBOH->fetchColumn() == 0) {
        $days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        $stmtInsertBOH = $pdo->prepare(
          "INSERT INTO branch_operating_hours_tb (branch_id, day_of_week, start_time, end_time, is_closed) 
          VALUES (?, ?, '06:00:00', '19:00:00', 0)"
        );

        foreach($days as $day) {
          $stmtInsertBOH->execute([$realBranchId, $day]);
        }
      }
    }

    // fetch clinic by branch
    $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinic_branches_tb WHERE branch_id = ?");
    $stmtClinic->execute([$realBranchId]);
    $clinicRow = $stmtClinic->fetch();
    $clinicId = $clinicRow['clinic_id'] ?? 0;

    $action = ($type === 'activation') ? 'CREATE' : 'UPDATE';
    $entity = 'SUBSCRIPTION_' . strtoupper($type);
    $currentUserId = $user->user_id;


      
    // Fetch the Clinic Admin's User ID and Plan Details
    $stmtAdmin = $pdo->prepare(
      "SELECT c.created_by as admin_id, cb.name as branch_name, s.name as plan_name
      FROM clinic_branches_tb cb
      JOIN clinics_tb c ON cb.clinic_id = c.clinic_id
      JOIN subscription_tb s ON s.subscription_id = ?
      WHERE cb.branch_id = ?"
    );
    $stmtAdmin->execute([$newSubId, $realBranchId]);
    $adminData = $stmtAdmin->fetch();

    if ($adminData) {
      require_once __DIR__ . '/../../../../helper/send_notification.php';
      
      $title = "Subscription " . ucfirst($type) . ": " . ucwords($adminData['branch_name']);
      
      // 👇 Wrap these three in ucwords() 👇
      $branchName = ucwords($adminData['branch_name']);
      $planName = ucwords($adminData['plan_name']);
      $payerName = ucwords(trim($user->fname . ' ' . $user->lname));
      
      $payerRole = ($user->role === 'clinic_admin') ? 'Clinic Admin' : 'Branch Admin';
      $paidByText = " by {$payerRole} ({$payerName})";
      
      // Attach the Payer info to the message
      if ($type === 'upgrade') {
        $message = "The subscription for {$branchName} was successfully upgraded to the {$planName} plan{$paidByText}.";
      } elseif ($type === 'renewal') {
        $message = "The {$planName} plan for {$branchName} was successfully renewed{$paidByText}.";
      } else {
        $message = "The {$planName} plan for {$branchName} was successfully paid and activated{$paidByText}.";
      }
      
      send_notification($pdo, $adminData['admin_id'], 'billing', $title, $message);
      
      // 2. Send to the Branch Admin(s) via branch_staff_tb
      $stmtBranchAdmins = $pdo->prepare(
        "SELECT bs.user_id 
        FROM branch_staff_tb bs
        JOIN user_tb u ON bs.user_id = u.user_id
        WHERE bs.branch_id = ? 
          AND bs.status = 1"
      );
      $stmtBranchAdmins->execute([$realBranchId]);
      $branchAdmins = $stmtBranchAdmins->fetchAll();

      foreach ($branchAdmins as $ba) {
        // Prevent sending a duplicate notification if the Clinic Admin is somehow also in the branch_staff_tb
        if ($ba['user_id'] !== $adminData['admin_id']) {
          send_notification($pdo, $ba['user_id'], 'billing', $title, $message);
        }
      }
    }

    // --- 3. NOTIFY ALL SUPER ADMINS ---
    try {
      // Fetch all Super Admins (Role 1)
      $stmtSAs = $pdo->prepare("SELECT user_id FROM user_tb WHERE role_id = 1");
      $stmtSAs->execute();
      $superAdminIds = $stmtSAs->fetchAll(PDO::FETCH_COLUMN);

      // Ensure names are clean for the Super Admin alert
      $cleanPlan = ucwords(strtolower($adminData['plan_name']));
      $cleanBranch = ucwords(strtolower($adminData['branch_name']));
      $cleanPayer = ucwords(strtolower(trim($user->fname . ' ' . $user->lname)));

      // Super Admin Title
      $saTitle = "Payment Received: $cleanPlan ($cleanBranch)";
      
      // Super Admin Message
      $saMessage = "(#$currentUserId) $cleanPayer ($payerRole) has successfully processed a $cleanPlan " . strtoupper($type) . " for $cleanBranch.";

      foreach ($superAdminIds as $saId) {
        send_notification($pdo, $saId, 'billing', $saTitle, $saMessage);
      }
    } catch (Exception $e) {
      error_log("Super Admin Notification Error: " . $e->getMessage());
    }

    // audit log
    log_audit(
      $pdo, 
      $currentUserId, 
      $clinicId, 
      $realBranchId, 
      $action, 
      $entity, 
      $newSubId
    );

    $pdo->commit();
    echo json_encode(["success" => true, "type" => $type]);
  } else {
    $pdo->rollBack();
    echo json_encode(["success" => false, "message" => "Invoice not paid."]);
  }
} catch(Exception $e) {
  if(isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}