<?php
require_once __DIR__ . '/../../../../vendor/autoload.php';
require_once __DIR__ . '/../../../../config/Database.php';

use Dompdf\Dompdf;
use Dompdf\Options;

$transaction_id = $_GET['id'] ?? null;
if (!$transaction_id) die("Transaction ID is required.");

try {
  $database = new Database();
  $pdo = $database->pdo;

  // 1. FETCH PLATFORM DETAILS FOR FOOTER
  $platformStmt = $pdo->query("SELECT platform_name, platform_logo FROM platform_settings_tb LIMIT 1");
  $platform = $platformStmt->fetch();
  $platformName = $platform['platform_name'] ?? 'Our Platform';
  $platformLogoHtml = '';

  if (!empty($platform['platform_logo'])) {
    $logoPath = __DIR__ . '/../../../../' . $platform['platform_logo']; 
    if(file_exists($logoPath)) {
      $type = pathinfo($logoPath, PATHINFO_EXTENSION);
      $data = file_get_contents($logoPath);
      $base64 = 'data:image/' . $type . ';base64,' . base64_encode($data);
      $platformLogoHtml = "<img src='{$base64}' style='height: 12px; vertical-align: middle; margin-right: 4px;' />";
    }
  }

  // 2. GET ORDER AND BRANCH DETAILS
  $stmt = $pdo->prepare(
    "SELECT 
      o.order_id as transaction_id,
      o.total_amount as gross_amount,
      o.order_status,
      o.created_at as transaction_date,
      b.name as branch_name,
      c.name as clinic_name, 
      b.logo_picture as clinic_logo,
      pay.payment_method,
      p.name as pet_name,
      CONCAT(u.first_name, ' ', u.last_name) as owner_name,
      CONCAT(s_user.first_name, ' ', s_user.last_name) as assigned_staff,
      CONCAT(cashier.first_name, ' ', cashier.last_name) as cashier_name,
      a.start_time, 
      a.end_time
    FROM order_tb o
    JOIN clinic_branches_tb b ON o.branch_id = b.branch_id
    JOIN clinics_tb c ON b.clinic_id = c.clinic_id
    LEFT JOIN payments_tb pay ON o.order_id = pay.order_id
    LEFT JOIN appointments_tb a ON a.order_id = o.order_id
    LEFT JOIN pet_tb p ON a.pet_id = p.pet_id
    LEFT JOIN user_tb u ON o.user_id = u.user_id  -- 🔥 Fixed Join for Shop Buyers
    LEFT JOIN branch_staff_tb s ON a.staff_id = s.staff_id
    LEFT JOIN user_tb s_user ON s.user_id = s_user.user_id
    LEFT JOIN user_tb cashier ON o.last_updated_by = cashier.user_id -- 🔥 Added Cashier lookup
    WHERE o.order_id = :id"
  );
  $stmt->execute([':id' => $transaction_id]);
  $trx = $stmt->fetch();

  if (!$trx) die("Transaction not found.");

  // header logo
  $clinicLogoHtml = '';
  if(!empty($trx['clinic_logo'])) {
    $cLogoPath = __DIR__ . '/../../../../' . $trx['clinic_logo']; 
    if(file_exists($cLogoPath)) {
      $type = pathinfo($cLogoPath, PATHINFO_EXTENSION);
      $data = file_get_contents($cLogoPath);
      $base64 = 'data:image/' . $type . ';base64,' . base64_encode($data);
      $clinicLogoHtml = "<td valign='middle' style='padding-right: 8px;'><img src='{$base64}' style='max-height: 24px; display: block; border-radius: 4px;' /></td>";
    }
  }

  // get order items
  $itemStmt = $pdo->prepare(
    "SELECT oi.*, s.custom_name as service_name, prod.name as product_name 
    FROM order_items_tb oi 
    LEFT JOIN branch_service_tb s ON oi.service_id = s.branch_service_id
    LEFT JOIN products_tb prod ON oi.product_id = prod.product_id
    WHERE oi.order_id = :id"
  );
  $itemStmt->execute([':id' => $transaction_id]);
  $items = $itemStmt->fetchAll();

  // setup DomPDF
  $options = new Options();
  $options->set('isHtml5ParserEnabled', true);
  $options->set('isRemoteEnabled', true); 
  $options->set('defaultFont', 'DejaVu Sans'); 
  $dompdf = new Dompdf($options);

  // generate table rows
  $itemsHtml = '';
  foreach ($items as $item) {
    $name = ucwords(strtolower($item['service_name'] ?: $item['product_name']));
    if(strlen($name) > 35) {
      $name = substr($name, 0, 32) . '...';
    }
    $type = $item['service_id'] ? 'Service' : 'Product';
    $itemsHtml .= "
      <tr>
        <td style='padding: 10px; border-bottom: 1px solid #eee;'>
          <strong>$name</strong><br>
          <small style='color:#666; text-transform: uppercase; font-size: 8px;'>$type</small>
        </td>
        <td align='center' style='padding: 10px; border-bottom: 1px solid #eee;'>{$item['quantity']}</td>
        <td align='right' style='padding: 10px; border-bottom: 1px solid #eee;'>PHP " . number_format($item['subtotal'], 2) . "</td>
      </tr>";
  }

  // Formatted Output Variables
  $ownerName = trim($trx['owner_name']);
  $isGuest = empty($ownerName);
  $displayName = $isGuest ? 'Guest Walk-in' : $ownerName;
  $nameStyle = $isGuest ? 'color: #777;' : 'color: #333;';

  $petHtml = !empty($trx['pet_name']) 
      ? "<span style='font-size: 11px; color: #555;'>Pet: " . htmlspecialchars($trx['pet_name']) . "</span>" 
      : "";

  $assistedBy = trim($trx['assigned_staff'] ?: $trx['cashier_name'] ?: 'Staff');

  $appointmentInfo = "";
  if(!empty($trx['start_time'])) {
    $date = date("F d, Y", strtotime($trx['start_time']));
    $start = date("h:i A", strtotime($trx['start_time']));
    $end = !empty($trx['end_time']) ? date("h:i A", strtotime($trx['end_time'])) : '---';
    
    $appointmentInfo = "
      <div style='margin-top: 8px; padding: 8px; border: 1px dashed #ccc; border-radius: 4px; background-color: #fafafa;'>
        <small style='color: #999; text-transform: uppercase; font-size: 8px;'>Service Schedule</small><br>
        <strong style='font-size: 10px;'>$date</strong><br>
        <span style='font-size: 10px; color: #555;'>$start - $end</span>
      </div>";
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
        .clinic-name { display: inline-block; vertical-align: middle; font-size: 14px; font-weight: bold; color: #42756C; text-transform: uppercase; letter-spacing: 2px; }
        .info-section { width: 100%; margin-top: 20px; padding-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .table th { background: #f4f4f4; padding: 10px; font-size: 10px; text-align: left; text-transform: uppercase; }
        .total-box { margin-top: 30px; background: #1a1a1a; color: white; padding: 20px; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class='container'>
        <div class='header'>
          <table align='center' style='margin: 0 auto 5px auto; border-collapse: collapse;'>
            <tr>
              {$clinicLogoHtml}
              <td valign='middle'>
                <div class='clinic-name'>" . htmlspecialchars($trx['clinic_name']) . "</div>
              </td>
            </tr>
          </table>

          <h2 style='margin:0; letter-spacing: 1.5px; font-size: 24px; color: #111;'>OFFICIAL RECEIPT</h2>
          <p style='color:#666; font-size:11px; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;'>ID: #TRANSAC-{$trx['transaction_id']}</p>
        </div>

        <table class='info-section'>
          <tr>
            <td width='50%' valign='top'>
              <small style='color:#888; text-transform: uppercase; font-size: 9px;'>Client</small><br>
              <strong style='font-size: 14px; text-transform: capitalize; {$nameStyle}'>" . htmlspecialchars($displayName) . "</strong><br>
              {$petHtml}
            </td>
            <td align='right' width='50%' valign='top'>
              <small style='color:#888; text-transform: uppercase; font-size: 9px;'>Assisted By</small><br>
              <strong style='font-size: 12px; text-transform: capitalize;'>" . htmlspecialchars($assistedBy) . "</strong><br>
              $appointmentInfo
            </td>
          </tr>
        </table>

        <table class='table'>
          <thead>
            <tr>
              <th>Description</th>
              <th align='center'>Qty</th>
              <th align='right'>Subtotal</th>
            </tr>
          </thead>
          <tbody>$itemsHtml</tbody>
        </table>

        <div class='total-box'>
          <table width='100%'>
            <tr>
              <td valign='middle'>
                <small style='opacity:0.7; font-size: 10px; text-transform: uppercase;'>Payment Method</small><br>
                <strong style='font-size: 14px; text-transform: uppercase;'>" . htmlspecialchars($trx['payment_method'] ?: 'CASH') . "</strong>
              </td>
              <td align='right' valign='middle'>
                <span style='font-size:10px; opacity:0.7; text-transform: uppercase;'>Gross Amount Due</span><br>
                <strong style='font-size:22px'>PHP " . number_format($trx['gross_amount'], 2) . "</strong>
              </td>
            </tr>
          </table>
        </div>

        <div style='text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; margin-top: 20px; padding-top: 15px; letter-spacing: 0.5px;'>
          Transaction Date: " . date("F d, Y", strtotime($trx['transaction_date'])) . " | Generated on " . date("F d, Y h:i A") . "<br>
          <em style='display: block; margin: 8px 0;'>Thank you for trusting us with your pet's care!</em>
          <div style='margin-top: 15px; font-size: 8px; color: #bbb;'>
            Powered by {$platformLogoHtml} <strong style='color: #42756C;'>{$platformName}</strong>
          </div>
        </div>
      </div>
    </body>
  </html>";

  $dompdf->loadHtml($html, 'UTF-8');
  $dompdf->setPaper('A4', 'portrait');
  $dompdf->render();
  $dompdf->stream("TRANSAC-{$transaction_id}.pdf", ["Attachment" => true]);

} catch(Exception $e) {
  http_response_code(500);
  die("Error: " . $e->getMessage());
}
?>