<?php
require_once __DIR__ . '/../../../../vendor/autoload.php';
require_once __DIR__ . '/../../../../config/Database.php';

use Dompdf\Dompdf;
use Dompdf\Options;

// 1. FLEXIBLE ID CAPTURE
$transaction_id = $_GET['id'] ?? $_GET['transaction_id'] ?? null;
$user_id = $_GET['user_id'] ?? null;
$branch_id = $_GET['branch_id'] ?? null;
$type_filter = $_GET['type'] ?? 'all';

if (!$transaction_id && !$user_id) die("Transaction ID or User ID is required.");

try {
  $database = new Database();
  $pdo = $database->pdo;

  // 2. FETCH PLATFORM DETAILS
  $platformStmt = $pdo->query("SELECT platform_name, platform_logo FROM platform_settings_tb LIMIT 1");
  $platform = $platformStmt->fetch();
  $platformName = $platform['platform_name'] ?? 'Our Platform';
  $platformLogoHtml = '';

  if (!empty($platform['platform_logo'])) {
    $logoPath = __DIR__ . '/../../../../' . $platform['platform_logo']; 
    if(file_exists($logoPath)) {
      $typeExt = pathinfo($logoPath, PATHINFO_EXTENSION);
      $data = file_get_contents($logoPath);
      $base64 = 'data:image/' . $typeExt . ';base64,' . base64_encode($data);
      $platformLogoHtml = "<img src='{$base64}' style='height: 12px; vertical-align: middle; margin-right: 4px;' />";
    }
  }

  // 3. DYNAMIC QUERY BUILDING
  $query = "SELECT 
      o.order_id as transaction_id,
      o.total_amount as gross_amount,
      o.order_status,
      o.created_at as transaction_date,
      o.pickup_date,
      b.name as branch_name,
      c.name as clinic_name, 
      b.logo_picture as clinic_logo,
      pay.payment_method,
      pay.cash_received,
      pay.cash_change,
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
    LEFT JOIN user_tb u ON o.user_id = u.user_id 
    LEFT JOIN branch_staff_tb s ON a.staff_id = s.staff_id
    LEFT JOIN user_tb s_user ON s.user_id = s_user.user_id
    LEFT JOIN user_tb cashier ON o.last_updated_by = cashier.user_id
    WHERE 1=1";

  $params = [];
  if ($transaction_id && $transaction_id !== 'undefined') {
    $query .= " AND o.order_id = :id";
    $params[':id'] = $transaction_id;
  } else if ($user_id && $user_id !== 'undefined') {
    $query .= " AND o.user_id = :uid";
    $params[':uid'] = $user_id;
  }

  if (!empty($branch_id) && $branch_id !== 'all' && $branch_id !== 'undefined') {
    $query .= " AND o.branch_id = :bid";
    $params[':bid'] = $branch_id;
  }

  if ($type_filter === 'product') {
    $query .= " AND (o.pickup_date IS NOT NULL AND o.pickup_date != '')";
  } else if ($type_filter === 'appointment') {
    $query .= " AND (o.pickup_date IS NULL OR o.pickup_date = '')";
  }

  $query .= " ORDER BY o.created_at DESC";
  $stmt = $pdo->prepare($query);
  $stmt->execute($params);
  $all_transactions = $stmt->fetchAll();

  if (!$all_transactions) {
      echo "<div style='font-family:sans-serif; text-align:center; margin-top:50px;'><h2>No Transactions Found</h2></div>";
      exit;
  }

  $html = "<html><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8'/>
  <style>
    body { font-family: 'DejaVu Sans', sans-serif; color: #333; margin: 0; padding: 0; }
    .container { padding: 30px; page-break-after: always; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .clinic-name { display: inline-block; vertical-align: middle; font-size: 14px; font-weight: bold; color: #42756C; text-transform: uppercase; letter-spacing: 2px; }
    .info-section { width: 100%; margin-top: 20px; padding-bottom: 20px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .table th { background: #f4f4f4; padding: 10px; font-size: 10px; text-align: left; text-transform: uppercase; }
    .total-box { margin-top: 30px; background: #1a1a1a; color: white; padding: 20px; border-radius: 8px; }
  </style></head><body>";

  foreach ($all_transactions as $trx) {
    $itemStmt = $pdo->prepare("
        SELECT oi.*, s.custom_name as service_name, prod.name as product_name, prod.brand_name, prod.brand_type, prod.dosage
        FROM order_items_tb oi 
        LEFT JOIN branch_service_tb s ON oi.service_id = s.branch_service_id 
        LEFT JOIN products_tb prod ON oi.product_id = prod.product_id 
        WHERE oi.order_id = :id
    ");
    $itemStmt->execute([':id' => $trx['transaction_id']]);
    $items = $itemStmt->fetchAll();

    $itemsHtml = '';
    foreach ($items as $item) {
        $name = ucwords(strtolower($item['service_name'] ?: $item['product_name'] ?? 'Item'));
        if(strlen($name) > 35) $name = substr($name, 0, 32) . '...';
        $type = $item['service_id'] ? 'Service' : 'Product';
        $unitPrice = $item['subtotal'] / ($item['quantity'] ?: 1);
        $details = [];
        if (!empty($item['brand_name']) && strtoupper($item['brand_name']) !== 'N/A') $details[] = $item['brand_name'];
        if (!empty($item['brand_type']) && strtoupper($item['brand_type']) !== 'N/A') $details[] = $item['brand_type'];
        if (!empty($item['dosage']) && strtoupper($item['dosage']) !== 'N/A') $details[] = $item['dosage'];
        $detailsText = !empty($details) ? implode(' • ', $details) : $type;

        $itemsHtml .= "
        <tr>
            <td style='padding: 10px; border-bottom: 1px solid #eee;'>
                <strong>" . htmlspecialchars($name) . "</strong><br>
                <small style='color:#666; text-transform: uppercase; font-size: 8px;'>$detailsText</small>
            </td>
            <td align='center' style='padding: 10px; border-bottom: 1px solid #eee; font-size: 10px;'>" . number_format($unitPrice, 2) . "</td>
            <td align='center' style='padding: 10px; border-bottom: 1px solid #eee;'>{$item['quantity']}</td>
            <td align='right' style='padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;'>" . number_format($item['subtotal'], 2) . "</td>
        </tr>";
    }

    $ownerName = trim($trx['owner_name'] ?? '');
    $displayName = empty($ownerName) ? 'Guest Walk-in' : $ownerName;
    $petHtml = !empty($trx['pet_name']) ? "<span style='font-size: 11px; color: #555;'>Pet: " . htmlspecialchars($trx['pet_name']) . "</span>" : "";
    $assistedBy = trim($trx['assigned_staff'] ?: $trx['cashier_name'] ?: 'Staff');
    
    $appointmentInfo = "";
    if(!empty($trx['start_time'])) {
      $date = date("F d, Y", strtotime($trx['start_time']));
      $start = date("h:i A", strtotime($trx['start_time']));
      $end = !empty($trx['end_time']) ? date("h:i A", strtotime($trx['end_time'])) : '---';
      $appointmentInfo = "<div style='margin-top: 8px; padding: 8px; border: 1px dashed #ccc; border-radius: 4px; background-color: #fafafa;'><small style='color: #999; text-transform: uppercase; font-size: 8px;'>Service Schedule</small><br><strong style='font-size: 10px;'>$date</strong><br><span style='font-size: 10px; color: #555;'>$start - $end</span></div>";
    }

    // CASH LOGIC: Only Products default to exact amount. Appointments/Services show change.
    $isProduct = ($type_filter === 'product' || !empty($trx['pickup_date']));
    if ($isProduct) {
        $displayCashReceived = $trx['gross_amount'];
        $displayChange = 0;
    } else {
        $displayCashReceived = $trx['cash_received'] ?? 0;
        $displayChange = $trx['cash_change'] ?? 0; // Using cash_change per request
    }

    $html .= "
      <div class='container'>
        <div class='header'>
          <div class='clinic-name'>" . htmlspecialchars($trx['branch_name']) . "</div>
          <h2 style='margin:10px 0 0 0; letter-spacing: 1.5px; font-size: 24px; color: #111;'>OFFICIAL RECEIPT</h2>
          <p style='color:#666; font-size:11px; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;'>ID: #TRANSAC-{$trx['transaction_id']}</p>
        </div>

        <table class='info-section'>
          <tr>
            <td width='50%' valign='top'>
              <small style='color:#888; text-transform: uppercase; font-size: 9px;'>Client</small><br>
              <strong style='font-size: 14px; text-transform: capitalize;'>" . htmlspecialchars($displayName) . "</strong><br>
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
          <thead><tr><th>Description</th><th align='right'>Price</th><th align='right'>Qty</th><th align='right'>Subtotal</th></tr></thead>
          <tbody>$itemsHtml</tbody>
        </table>

        <div class='total-box'>
          <table width='100%'>
            <tr>
              <td width='50%' valign='middle'>
                <small style='opacity:0.7; font-size: 10px; text-transform: uppercase;'>Payment Method</small><br>
                <strong style='font-size: 14px; text-transform: uppercase;'>" . htmlspecialchars($trx['payment_method'] ?: 'CASH') . "</strong>
              </td>
              <td width='50%' align='right'>
                <table align='right'>
                  <tr>
                    <td align='right' style='font-size: 10px; opacity:0.8;'>TOTAL DUE:</td>
                    <td align='right' style='padding-left: 20px; font-size: 12px; font-weight: bold;'>PHP " . number_format($trx['gross_amount'], 2) . "</td>
                  </tr>
                  <tr>
                    <td align='right' style='font-size: 10px; opacity:0.8;'>CASH RECEIVED:</td>
                    <td align='right' style='padding-left: 20px; font-size: 12px;'>PHP " . number_format($displayCashReceived, 2) . "</td>
                  </tr>
                  <tr>
                    <td align='right' style='font-size: 10px; opacity:0.8;'>CHANGE:</td>
                    <td align='right' style='padding-left: 20px; font-size: 12px;'>PHP " . number_format($displayChange, 2) . "</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>

        <div style='text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; margin-top: 20px; padding-top: 15px;'>
          Transaction Date: " . date("F d, Y", strtotime($trx['transaction_date'])) . "<br>
          <em style='display: block; margin: 8px 0;'>Thank you for trusting {$platformName}!</em>
          <div style='margin-top: 15px; font-size: 8px;'>
            Powered by {$platformLogoHtml} <strong style='color: #42756C;'>{$platformName}</strong>
          </div>
        </div>
      </div>";
  }

  $html .= "</body></html>";

  $options = new Options();
  $options->set('isHtml5ParserEnabled', true);
  $options->set('isRemoteEnabled', true);
  $dompdf = new Dompdf($options);
  $dompdf->loadHtml($html, 'UTF-8');
  $dompdf->setPaper('A4', 'portrait');
  $dompdf->render();
  
  $filename = $user_id ? "BILLING-HISTORY-{$user_id}.pdf" : "TRANSAC-{$transaction_id}.pdf";
  $dompdf->stream($filename, ["Attachment" => true]);

} catch(Exception $e) {
  die("Error: " . $e->getMessage());
}