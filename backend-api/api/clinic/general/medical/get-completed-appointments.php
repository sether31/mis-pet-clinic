<?php
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';

// The auth middleware returns the user data (including role and potentially their assigned branch_id)
$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

if(!isset($_GET['branch_id'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Branch ID is required."]);
    exit;
}

$branch_id = $_GET['branch_id'];

try {
    $pdo = (new Database())->pdo;

    // We no longer need to find the clinic_id because we are filtering 
    // strictly by the branch the user is currently viewing/accessing.
    
    $stmt = $pdo->prepare(
        "SELECT 
            a.appointment_id,
            a.pet_id,
            a.user_id as owner_id,
            a.start_time,
            a.status as appointment_status,
            p.name AS pet_name,
            p.pet_picture, 
            p.breed AS pet_breed,    
            p.sex AS pet_sex,
            u.profile_picture as owner_picture,   
            u.first_name AS owner_fname, 
            u.last_name AS owner_lname,
            u.phone_number,
            bs.custom_name AS current_service_name,
            br.branch_id,
            br.name AS branch_name, 
            br.municipality, 
            br.address,
            su.first_name AS staff_fname,
            su.last_name AS staff_lname,
            r.role_name AS staff_role,
            m.medical_id,
            m.diagnosis,
            m.treatment,
            m.record_date,               
            m.service_name_at_time,
            m.service_price_at_time,
            m.record_type,
            m.status,
            m.updated_by,
            m.med_image_1,
            m.med_image_2,
            m.med_doc_1,
            m.med_doc_2,
            m.updated_at,
            updater.first_name AS updater_fname,
            updater.last_name AS updater_lname
        FROM appointments_tb a
        INNER JOIN pet_tb p ON a.pet_id = p.pet_id
        INNER JOIN user_tb u ON a.user_id = u.user_id
        INNER JOIN branch_service_tb bs ON a.service_id = bs.branch_service_id
        INNER JOIN clinic_branches_tb br ON a.branch_id = br.branch_id
        LEFT JOIN branch_staff_tb st ON a.staff_id = st.staff_id
        LEFT JOIN user_tb su ON st.user_id = su.user_id
        LEFT JOIN roles_tb r ON su.role_id = r.role_id 
        LEFT JOIN medrecord_tb m ON a.appointment_id = m.appointment_id
        LEFT JOIN user_tb updater ON m.updated_by = updater.user_id
        WHERE a.branch_id = :branch_id 
          AND a.status IN ('Completed', 'Billed')
        ORDER BY COALESCE(m.record_date, a.start_time) DESC"
    );

    $stmt->execute([':branch_id' => $branch_id]);
    $records = $stmt->fetchAll();

    $cardData = [
        "total" => count($records),
        "unrecorded" => 0,
        "medical" => 0,
        "nonMedical" => 0,
        "thisMonth" => 0,
        "addedToday" => 0 
    ];

    $currentMonth = date('m');
    $currentYear = date('Y');
    $currentDate = date('Y-m-d'); 

    $formattedRecords = array_map(function($row) use (&$cardData, $currentMonth, $currentYear, $currentDate) {
        $row['owner_name'] = trim(($row['owner_fname'] ?? '') . ' ' . ($row['owner_lname'] ?? ''));
        $row['staff_name'] = $row['staff_fname'] ? trim($row['staff_fname'] . ' ' . $row['staff_lname']) : 'Unassigned';
        $row['staff_role_display'] = str_replace('_', ' ', $row['staff_role'] ?? '');
        $row['updated_by_staff_name'] = ($row['updater_fname'] || $row['updater_lname']) 
            ? trim(($row['updater_fname'] ?? '') . ' ' . ($row['updater_lname'] ?? '')) 
            : null;

        $recordType = strtolower(trim($row['record_type'] ?? ''));
        
        if ($recordType === 'medical') {
            $cardData['medical']++;
        } elseif (in_array($recordType, ['non-medical', 'non_medical', 'nonmedical'])) {
            $cardData['nonMedical']++;
        } else {
            $cardData['unrecorded']++;
        }

        $dateString = $row['record_date'] ?: $row['start_time'];
        if ($dateString) {
            $ts = strtotime($dateString);
            if (date('m', $ts) === $currentMonth && date('Y', $ts) === $currentYear) {
                $cardData['thisMonth']++;
            }
            if (date('Y-m-d', $ts) === $currentDate) {
                $cardData['addedToday']++;
            }
        }

        return $row;
    }, $records);

    echo json_encode([
        "success" => true,
        "count" => count($formattedRecords),
        "data" => $formattedRecords,
        "cardData" => $cardData 
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server Error: " . $e->getMessage()]);
}
?>