<?php
require_once __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../../config/Database.php';

use Dompdf\Dompdf;
use Dompdf\Options;

$branch_id = $_GET['id'] ?? null;
if (!$branch_id) die("Branch ID is required.");

try {
  $database = new Database();
  $pdo = $database->pdo;

  // get platform details
  $platformStmt = $pdo->query("SELECT platform_name, platform_logo FROM platform_settings_tb LIMIT 1");
  $platform = $platformStmt->fetch();
  
  $platformName = $platform['platform_name'] ?? 'Platform Name';
  $logoHtml = '';

  if(!empty($platform['platform_logo'])) {
    $logoPath = __DIR__ . '/../../../' . $platform['platform_logo']; 
    
    if(file_exists($logoPath)) {
      $type = pathinfo($logoPath, PATHINFO_EXTENSION);
      $data = file_get_contents($logoPath);
      $base64 = 'data:image/' . $type . ';base64,' . base64_encode($data);
      $logoHtml = "<img src='{$base64}' style='max-height: 30px; vertical-align: middle; margin-right: 4px;' />";
    }
  }

  // get clinic and branch details
  $stmt = $pdo->prepare(
    "SELECT 
      b.branch_id,
      b.created_at AS member_since,
      c.name AS clinic_name,
      b.name AS branch_name,
      s.name AS plan_name,
      bs.status AS current_status,
      bs.end_date
    FROM clinic_branches_tb b
    LEFT JOIN clinics_tb c ON b.clinic_id = c.clinic_id
    LEFT JOIN branch_subscriptions_tb bs ON b.branch_id = bs.branch_id
    LEFT JOIN subscription_tb s ON bs.subscription_id = s.subscription_id
    WHERE b.branch_id = :id"
  );
  $stmt->execute([':id' => $branch_id]);
  $branch = $stmt->fetch();

  if (!$branch) die("Branch not found.");

  // format sub and status
  $planName = $branch['plan_name'] ? ucwords(strtolower($branch['plan_name'])) : 'No Active Plan';
  $status = ucfirst(strtolower($branch['current_status'] ?: 'Unsubscribed'));
  $memberSince = $branch['member_since'] ? date("F d, Y", strtotime($branch['member_since'])) : 'N/A';

  // get history of this branch
  $historyStmt = $pdo->prepare(
    "SELECT 
      payment_id, 
      amount, 
      payment_status, 
      payment_method, 
      created_at AS payment_date 
    FROM payments_tb
    WHERE branch_id = :id 
    AND payment_type = 'subscription' 
    AND payment_status = 'paid'
    ORDER BY created_at DESC"
  );
  $historyStmt->execute([':id' => $branch_id]);
  $payments = $historyStmt->fetchAll();

  // setup DomPDF
  $options = new Options();
  $options->set('isHtml5ParserEnabled', true);
  $options->set('isRemoteEnabled', true); 
  $options->set('defaultFont', 'DejaVu Sans'); 
  $dompdf = new Dompdf($options);

  // generate table rows
  $itemsHtml = '';
  $totalPaid = 0;

  if(count($payments) > 0) {
    foreach ($payments as $payment) {
      $totalPaid += (float)$payment['amount'];
      $date = date("M d, Y", strtotime($payment['payment_date']));
      $time = date("h:i A", strtotime($payment['payment_date']));
      $method = strtoupper($payment['payment_method'] ?: 'ONLINE');
      
      $itemsHtml .= "
        <tr>
          <td style='padding: 10px; border-bottom: 1px solid #eee;'>
            <strong>{$planName}</strong><br>
            <small style='color:#666; text-transform: uppercase; font-size: 8px;'>ID: #{$payment['payment_id']} &nbsp;•&nbsp; {$date} {$time}</small>
          </td>
          <td align='center' style='padding: 10px; border-bottom: 1px solid #eee;'>
            {$method}
          </td>
          <td align='right' style='padding: 10px; border-bottom: 1px solid #eee;'>
            PHP " . number_format($payment['amount'], 2) . "
          </td>
        </tr>";
    }
  } else {
    $itemsHtml = "
      <tr>
        <td colspan='3' align='center' style='padding: 20px; color: #999; font-style: italic; border-bottom: 1px solid #eee;'>
          No payment history recorded yet.
        </td>
      </tr>";
  }

  // layout
  $html = "
  <html>
    <head>
      <meta http-equiv='Content-Type' content='text/html; charset=utf-8'/>
      <style>
        body { font-family: 'DejaVu Sans', sans-serif; color: #333; margin: 0; padding: 0; }
        .container { padding: 30px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .platform-name { display: inline-block; vertical-align: middle; font-size: 14px; font-weight: bold; color: #42756C; text-transform: uppercase; letter-spacing: 2px; }
        .info-section { width: 100%; margin-top: 20px; padding-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .table th { background: #f4f4f4; padding: 10px; font-size: 10px; text-align: left; text-transform: uppercase; }
        .total-box { margin-top: 30px; background: #1a1a1a; color: white; padding: 20px; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class='container'>
        <div class='header'>
          <div style='text-align: center; margin-bottom: 15px;'>
            {$logoHtml}
            <span class='platform-name'>{$platformName}</span>
          </div>
          <h2 style='margin:0; letter-spacing: 1px;'>OFFICIAL STATEMENT OF ACCOUNT</h2>
          <p style='color:#666; font-size:12px; margin-top: 5px;'>CLINIC ID: #{$branch['branch_id']}</p>
        </div>

        <table class='info-section'>
          <tr>
            <td width='50%' valign='top'>
              <small style='color:#888; text-transform: uppercase; font-size: 9px;'>Clinic & Branch</small><br>
              <strong style='font-size: 14px;'>" . htmlspecialchars($branch['clinic_name']) . "</strong><br>
              <span style='font-size: 11px; color: #555;'>Branch: " . htmlspecialchars($branch['branch_name']) . "</span>
              
              <div style='margin-top: 10px;'>
                <small style='color:#888; text-transform: uppercase; font-size: 9px;'>Member Since</small><br>
                <strong style='font-size: 11px; color: #333;'>{$memberSince}</strong>
              </div>
            </td>
            <td align='right' width='50%' valign='top'>
              <small style='color:#888; text-transform: uppercase; font-size: 9px;'>Current Subscription</small><br>
              <strong style='font-size: 14px; text-transform: capitalize;'>" . htmlspecialchars($planName) . "</strong><br>
              <span style='font-size: 11px; color: #555;'>Status: {$status}</span>
                
              <table align='right' style='margin-top: 12px; border: 1px dashed #ccc; border-radius: 4px; background-color: #fafafa; width: auto;'>
                <tr>
                  <td style='padding: 8px; text-align: right;'>
                    <small style='color: #999; text-transform: uppercase; font-size: 8px;'>Total Historical Payments</small><br>
                    <strong style='font-size: 10px; color: #333;'>" . count($payments) . " Transactions</strong>
                  </td>
                </tr>
              </table>
              </td>
          </tr>
        </table>

        <table class='table'>
          <thead>
            <tr>
              <th>Description & Date</th>
              <th align='center'>Method</th>
              <th align='right'>Amount Paid</th>
            </tr>
          </thead>
          <tbody>{$itemsHtml}</tbody>
        </table>

        <div class='total-box'>
          <table width='100%'>
            <tr>
              <td valign='middle'>
                <small style='opacity:0.7; font-size: 10px; text-transform: uppercase;'>Account Status</small><br>
                <strong style='font-size: 14px;'>" . strtoupper($status) . "</strong>
              </td>
              <td align='right' valign='middle'>
                <span style='font-size:10px; opacity:0.7; text-transform: uppercase;'>Total Paid</span><br>
                <strong style='font-size:22px'>PHP " . number_format($totalPaid, 2) . "</strong>
              </td>
            </tr>
          </table>
        </div>

        <div style='text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; margin-top: 20px; padding-top: 15px;'>
          Generated on " . date("F d, Y h:i A") . "<br>
          <em>Thank you for your continued partnership with {$platformName}!</em>
        </div>
      </div>
    </body>
  </html>";

  $dompdf->loadHtml($html, 'UTF-8');
  $dompdf->setPaper('A4', 'portrait');
  $dompdf->render();
  
  $fileName = "OFFICIAL_ACCOUNT_STATEMENT_CLINIC-{$branch_id}.pdf";
  $dompdf->stream($fileName, ["Attachment" => true]);

} catch(Exception $e) {
  http_response_code(500);
  die("Error: " . $e->getMessage());
}
?>