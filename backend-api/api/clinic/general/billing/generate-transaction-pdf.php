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

  $stmt = $pdo->prepare(
    "SELECT 
      o.order_id as transaction_id,
      o.total_amount as gross_amount,
      o.order_status,
      o.created_at as transaction_date,
      b.name as branch_name,
      pay.payment_method,
      p.name as pet_name,
      CONCAT(u.first_name, ' ', u.last_name) as owner_name,
      CONCAT(s_user.first_name, ' ', s_user.last_name) as assigned_staff,
      a.start_time, 
      a.end_time
    FROM order_tb o
    JOIN clinic_branches_tb b ON o.branch_id = b.branch_id
    LEFT JOIN payments_tb pay ON o.order_id = pay.order_id
    LEFT JOIN appointments_tb a ON a.order_id = o.order_id
    LEFT JOIN pet_tb p ON a.pet_id = p.pet_id
    LEFT JOIN user_tb u ON p.owner_id = u.user_id
    LEFT JOIN branch_staff_tb s ON a.staff_id = s.staff_id
    LEFT JOIN user_tb s_user ON s.user_id = s_user.user_id
    WHERE o.order_id = :id"
  );
  $stmt->execute([':id' => $transaction_id]);
  $trx = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$trx) die("Transaction not found.");

  // get items
  $itemStmt = $pdo->prepare(
    "SELECT oi.*, s.custom_name as service_name, prod.name as product_name 
    FROM order_items_tb oi 
    LEFT JOIN branch_service_tb s ON oi.service_id = s.branch_service_id
    LEFT JOIN products_tb prod ON oi.product_id = prod.product_id
    WHERE oi.order_id = :id"
  );
  $itemStmt->execute([':id' => $transaction_id]);
  $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

  $options = new Options();
  $options->set('isHtml5ParserEnabled', true);
  $options->set('isRemoteEnabled', true); 
  $options->set('defaultFont', 'DejaVu Sans'); 
  $dompdf = new Dompdf($options);

  $itemsHtml = '';
  foreach ($items as $item) {
    $name = $item['service_name'] ?: $item['product_name'];
    $type = $item['service_id'] ? 'Service' : 'Product';
    $itemsHtml .= "
      <tr>
        <td style='padding: 10px; border-bottom: 1px solid #eee;'>
            <strong>$name</strong><br>
            <small style='color:#666; text-transform: uppercase; font-size: 8px;'>$type</small>
        </td>
        <td align='center' style='padding: 10px; border-bottom: 1px solid #eee;'>{$item['quantity']}</td>
        <td align='right' style='padding: 10px; border-bottom: 1px solid #eee;'>₱" . number_format($item['subtotal'], 2) . "</td>
      </tr>";
  }

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

  $html = "
  <html>
    <head>
      <meta http-equiv='Content-Type' content='text/html; charset=utf-8'/>
      <style>
        body { font-family: 'DejaVu Sans', sans-serif; color: #333; margin: 0; padding: 0; }
        .container { padding: 30px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .info-section { width: 100%; margin-top: 20px; padding-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .table th { background: #f4f4f4; padding: 10px; font-size: 10px; text-align: left; text-transform: uppercase; }
        .total-box { margin-top: 30px; background: #1a1a1a; color: white; padding: 20px; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class='container'>
        <div class='header'>
          <h2 style='margin:0; letter-spacing: 1px;'>OFFICIAL TRANSACTION RECEIPT</h2>
          <p style='color:#666; font-size:12px; margin-top: 5px;'>ID: #TRANSAC-{$trx['transaction_id']}</p>
        </div>

        <table class='info-section'>
          <tr>
            <td width='50%' valign='top'>
              <small style='color:#888; text-transform: uppercase; font-size: 9px;'>Client & Pet</small><br>
              <strong style='font-size: 14px;'>" . htmlspecialchars($trx['owner_name']) . "</strong><br>
              <span style='font-size: 11px; color: #555;'>Pet: " . htmlspecialchars($trx['pet_name'] ?: 'N/A') . "</span>
            </td>
            <td align='right' width='50%' valign='top'>
              <small style='color:#888; text-transform: uppercase; font-size: 9px;'>Branch & Staff</small><br>
              <strong style='font-size: 12px;'>" . htmlspecialchars($trx['branch_name']) . "</strong><br>
              <span style='font-size: 11px; color: #555;'>Staff: " . htmlspecialchars($trx['assigned_staff'] ?: 'N/A') . "</span>
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
                <small style='opacity:0.7; font-size: 9px; text-transform: uppercase;'>Payment Method</small><br>
                <strong style='font-size: 12px;'>" . htmlspecialchars($trx['payment_method'] ?: 'PENDING') . "</strong>
              </td>
              <td align='right' valign='middle'>
                <span style='font-size:10px; opacity:0.7; text-transform: uppercase;'>Gross Amount Due</span><br>
                <strong style='font-size:22px'>₱ " . number_format($trx['gross_amount'], 2) . "</strong>
              </td>
            </tr>
          </table>
        </div>

        <div style='text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 20px;'>
          Transaction Date: " . date("F d, Y", strtotime($trx['transaction_date'])) . " | Generated on " . date("F d, Y h:i A") . "<br>
          <em>Thank you for trusting us with your pet's care!</em>
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