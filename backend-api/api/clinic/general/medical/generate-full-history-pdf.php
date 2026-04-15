<?php
require_once __DIR__ . '/../../../../vendor/autoload.php';
require_once __DIR__ . '/../../../../config/Database.php';

use Dompdf\Dompdf;
use Dompdf\Options;

ob_start();

$branch_id = $_GET['branch_id'] ?? null;
$pet_id = $_GET['pet_id'] ?? null;

if (!$branch_id || !$pet_id) die("Required parameters missing.");

try {
    $database = new Database();
    $pdo = $database->pdo;

    // 1. Platform Branding
    $platformStmt = $pdo->query("SELECT platform_name, platform_logo FROM platform_settings_tb LIMIT 1");
    $platform = $platformStmt->fetch();
    $platformName = $platform['platform_name'] ?? 'VET SYSTEM';
    $logoHtml = '';

    if(!empty($platform['platform_logo'])) {
        $logoPath = __DIR__ . '/../../../../' . $platform['platform_logo']; 
        if(file_exists($logoPath)) {
            $type = pathinfo($logoPath, PATHINFO_EXTENSION);
            $data = file_get_contents($logoPath);
            $base64 = 'data:image/' . $type . ';base64,' . base64_encode($data);
            $logoHtml = "<img src='{$base64}' style='height: 12px; vertical-align: middle; margin-right: 4px;' />";
        }
    }

    // 2. Clinic/Branch Info
    $branchStmt = $pdo->prepare("
        SELECT b.name as branch_name, c.name as clinic_name 
        FROM clinic_branches_tb b 
        JOIN clinics_tb c ON b.clinic_id = c.clinic_id 
        WHERE b.branch_id = :bid
    ");
    $branchStmt->execute([':bid' => $branch_id]);
    $branch = $branchStmt->fetch();

    // 3. Pet & Owner Info
    $petStmt = $pdo->prepare("
        SELECT p.*, u.first_name, u.last_name, u.user_id as owner_uid 
        FROM pet_tb p 
        JOIN user_tb u ON p.owner_id = u.user_id 
        WHERE p.pet_id = :pid
    ");
    $petStmt->execute([':pid' => $pet_id]);
    $pet = $petStmt->fetch();

    // 4. History Records (Updated to include 'status' from appointments)
    $historyStmt = $pdo->prepare("
        SELECT m.*, bs.custom_name as service_name, a.start_time, a.end_time
        FROM medrecord_tb m
        INNER JOIN appointments_tb a ON m.appointment_id = a.appointment_id
        INNER JOIN branch_service_tb bs ON a.service_id = bs.branch_service_id
        WHERE a.pet_id = :pid AND a.branch_id = :bid
        ORDER BY m.record_date DESC, m.created_at DESC
    ");
    $historyStmt->execute([':pid' => $pet_id, ':bid' => $branch_id]);
    $records = $historyStmt->fetchAll();

    $options = new Options();
    $options->set('isHtml5ParserEnabled', true);
    $options->set('isRemoteEnabled', true); 
    $dompdf = new Dompdf($options);

    $itemsHtml = '';
    if(count($records) > 0) {
        foreach ($records as $rec) {
            $date = date("M d, Y", strtotime($rec['record_date']));
            $sName = strtoupper($rec['service_name'] ?: 'N/A');
            $med_type = strtolower($rec['record_type'] ?? '');
            $diagRaw = trim($rec['diagnosis'] ?? '');

            $start = !empty($rec['start_time']) ? date("h:i A", strtotime($rec['start_time'])) : '--:--';
            $end = !empty($rec['end_time']) ? date("h:i A", strtotime($rec['end_time'])) : '--:--';

            /**
             * DATA LOGIC BASED ON STATUS
             */
              if ($med_type === 'medical') {
                $typeLabel = 'MEDICAL RECORD';
                $typeColor = '#42756C';
                $displayDiag = !empty($diagRaw) ? $diagRaw : 'No diagnosis recorded.';
                $displayTreat = !empty($rec['treatment']) ? $rec['treatment'] : 'N/A';
            } elseif ($med_type === 'non_medical') {
                $typeLabel = 'NON-MEDICAL';
                $typeColor = '#d97706';
                $displayDiag = 'N/A';
                $displayTreat = !empty($rec['treatment']) ? $rec['treatment'] : 'N/A';
            } else {
                $typeLabel = 'UNRECORDED';
                $typeColor = '#94a3b8'; 
                $displayDiag = 'N/A';
                $displayTreat = 'N/A';
            }

            $cond = !empty($rec['medical_condition']) ? $rec['medical_condition'] : 'UNSET';

            $itemsHtml .= "
                <tr>
                    <td width='25%' style='padding: 12px; border-bottom: 1px solid #eee;' valign='top'>
                        <strong style='font-size: 10px;'>{$date}</strong><br>
                        <div style='font-size: 8px; color: #666; margin-bottom: 4px;'>{$start} - {$end}</div>
                        <span style='display:inline-block; padding: 2px 4px; background: {$typeColor}; color:white; font-size:7px; font-weight:bold; border-radius:3px;'>{$typeLabel}</span>
                    </td>
                    <td style='padding: 12px; border-bottom: 1px solid #eee;' valign='top'>
                        <div style='font-size: 10px; font-weight: bold; color: #111;'>DIAGNOSIS:</div>
                        <div style='font-size: 10px; color: #444; margin-bottom: 5px;'>" . nl2br(htmlspecialchars($displayDiag)) . "</div>
                        <div style='font-size: 9px; font-weight: bold; color: #666; text-transform: uppercase;'>Treatment & Plan:</div>
                        <div style='font-size: 9px; color: #777; font-style: italic;'>" . nl2br(htmlspecialchars($displayTreat)) . "</div>
                    </td>
                </tr>";
        }
    } else {
        $itemsHtml = "<tr><td colspan='2' align='center' style='padding: 40px; color: #999;'>NO RECORDS FOUND</td></tr>";
    }

    // [Keeping the rest of your $html variable exactly as it was]
    $html = "
    <html>
    <head>
        <style>
            body { font-family: 'Helvetica', sans-serif; color: #333; margin: 0; padding: 0; }
            .container { padding: 30px; }
            .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 15px; }
            .info-section { width: 100%; margin-top: 20px; padding-bottom: 20px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .table th { background: #f4f4f4; padding: 10px; font-size: 9px; text-align: left; text-transform: uppercase; color: #666; }
            .summary-box { margin-top: 30px; background: #1a1a1a; color: white; padding: 15px; border-radius: 8px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <div style='font-size: 14px; font-weight: bold; color: #42756C; text-transform: uppercase; letter-spacing: 2px;'>{$branch['branch_name']}</div>
                <h2 style='margin:5px 0 0 0; letter-spacing: 0.5px; text-transform: uppercase;'>Complete Medical History</h2>
                <p style='color:#666; font-size:10px; margin-top: 5px;'>PATIENT RECORD: #{$pet_id}</p>
            </div>

            <table class='info-section'>
                <tr>
                    <td width='50%' valign='top'>
                        <small style='color:#888; text-transform: uppercase; font-size: 8px;'>Patient Details</small><br>
                        <strong style='font-size: 15px; color:#42756C;'>#{$pet_id} " . strtoupper($pet['name']) . "</strong><br>
                        <span style='font-size: 11px; color: #555;'>Breed: " . ($pet['breed'] ?: 'N/A') . "</span><br>
                        <div style='margin-top: 8px; font-size: 9px; font-weight: bold; color: #d97706;'>
                            CONDITION: " . ($pet['medical_conditions'] ?: 'N/A') . "
                        </div>
                    </td>
                    <td align='right' width='50%' valign='top'>
                        <small style='color:#888; text-transform: uppercase; font-size: 8px;'>Owner / Client</small><br>
                        <strong style='font-size: 13px;'>#{$pet['owner_uid']} {$pet['first_name']} {$pet['last_name']}</strong><br>
                        <span style='font-size: 10px; color: #555;'>Member Since: " . date("M Y", strtotime($pet['created_at'])) . "</span>
                    </td>
                </tr>
            </table>

            <table class='table'>
                <thead>
                    <tr>
                        <th>Date & Category</th>
                        <th>Clinical Findings & Treatment Plan</th>
                    </tr>
                </thead>
                <tbody>{$itemsHtml}</tbody>
            </table>

            <div class='summary-box'>
                <table width='100%'>
                    <tr>
                        <td>
                            <small style='opacity:0.7; font-size: 9px; text-transform: uppercase;'>Total History Records</small><br>
                            <strong style='font-size: 14px;'>" . count($records) . " Visits</strong>
                        </td>
                        <td align='right'>
                            <span style='font-size:9px; opacity:0.7; text-transform: uppercase;'>Clinic Brand</span><br>
                            <strong style='font-size:14px;'>" . strtoupper($branch['clinic_name']) . "</strong>
                        </td>
                    </tr>
                </table>
            </div>

            <div style='text-align: center; font-size: 8px; color: #999; border-top: 1px solid #eee; margin-top: 30px; padding-top: 15px;'>
                Generated on " . date("F d, Y h:i A") . " <br>
                <div style='margin-top: 15px; font-size: 8px; color: #bbb;'>
                    Powered by {$logoHtml} <strong style='color: #42756C;'>{$platformName}</strong>
                </div>
            </div>
        </div>
    </body>
    </html>";

    ob_end_clean();
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    $dompdf->stream("MEDICAL_HISTORY_#{$pet_id}.pdf", ["Attachment" => true]);

} catch(Exception $e) {
    ob_end_clean();
    die("PDF Error: " . $e->getMessage());
}