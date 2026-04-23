<?php
ob_clean();
date_default_timezone_set('Asia/Manila'); 

require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';

// Validate user
$decoded = validate_auth(['pet_owner']); 

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 

try {
    $pdo = (new Database())->pdo;

    $branch_id = $_GET['branch_id'] ?? null;
    $date = $_GET['date'] ?? null;
    $staff_id = $_GET['staff_id'] ?? null;
    $service_ids_raw = $_GET['service_ids'] ?? '';

    if (!$branch_id || !$date || !$staff_id || !$service_ids_raw) {
        throw new Exception("Missing parameters.");
    }

    // 1. Get Total Duration from branch_service_Tb
    $service_ids = array_filter(explode(',', $service_ids_raw));
    $placeholders = implode(',', array_fill(0, count($service_ids), '?'));
    
    // Note: Using branch_service_Tb as per your schema
    $stmtSrv = $pdo->prepare("SELECT duration FROM branch_service_Tb WHERE branch_service_id IN ($placeholders)");
    $stmtSrv->execute(array_values($service_ids));
    $services = $stmtSrv->fetchAll(PDO::FETCH_ASSOC);

    $totalDuration = 0;
    foreach ($services as $srv) {
        $totalDuration += (int)$srv['duration'];
    }

    if ($totalDuration <= 0) $totalDuration = 60; 

    // 2. Get Branch Hours
    $stmtHours = $pdo->prepare("SELECT start_time, end_time FROM branch_operating_hours_tb WHERE branch_id = ? LIMIT 1");
    $stmtHours->execute([$branch_id]);
    $bh = $stmtHours->fetch(PDO::FETCH_ASSOC);
    $startStr = $bh['start_time'] ?? '08:00:00';
    $endStr = $bh['end_time'] ?? '17:00:00';

    // 3. Fetch Existing Appointments (Strictly no first_name here)
    // Table appointments_tb only has IDs and times
    $stmtAppts = $pdo->prepare("
        SELECT start_time, end_time 
        FROM appointments_tb 
        WHERE staff_id = ? 
        AND DATE(start_time) = ? 
        AND status NOT IN ('cancelled', 'rejected')
    ");
    $stmtAppts->execute([$staff_id, $date]);
    $existing = $stmtAppts->fetchAll(PDO::FETCH_ASSOC);

    // 4. Generate Slots
    $currentPtr = strtotime("$date $startStr");
    $closingTime = strtotime("$date $endStr");
    $availableSlots = [];
    $now = time();

    while (($currentPtr + ($totalDuration * 60)) <= $closingTime) {
        $slotStart = $currentPtr;
        $slotEnd = $currentPtr + ($totalDuration * 60);
        $isAvailable = true;

        // Block past times
        if ($slotStart < $now) {
            $isAvailable = false;
        }

        // Overlap Check against existing appointments_tb data
        if ($isAvailable) {
            foreach ($existing as $appt) {
                $bookedStart = strtotime($appt['start_time']);
                $bookedEnd = strtotime($appt['end_time']);

                if ($slotStart < $bookedEnd && $slotEnd > $bookedStart) {
                    $isAvailable = false;
                    break;
                }
            }
        }

        $availableSlots[] = [
            "start" => date('H:i:s', $slotStart),
            "display_range" => date('h:i A', $slotStart) . " - " . date('h:i A', $slotEnd), 
            "is_available" => $isAvailable
        ];

        $currentPtr += ($totalDuration * 60); 
    }

    echo json_encode(["success" => true, "data" => $availableSlots]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}