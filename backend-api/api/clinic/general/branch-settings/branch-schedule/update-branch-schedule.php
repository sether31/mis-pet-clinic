<?php
require_once __DIR__ . '/../../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../../config/Database.php';

$decodedToken = validate_auth(['clinic_admin', 'branch_admin']);

$branchId = $_POST['branch_id'] ?? null;
$schedulesJson = $_POST['schedules'] ?? null;
$isMaintenance = $_POST['is_maintenance'] ?? 0;
$markConfigured = $_POST['mark_configured'] ?? 0;

if(!$branchId || !$schedulesJson) {
    echo json_encode(["success" => false, "message" => "Missing required data."]);
    exit;
}

try {
    $pdo = (new Database())->pdo;
    $pdo->beginTransaction();

    $schedules = json_decode($schedulesJson, true);
    
    // 1. Update individual day hours
    $stmt = $pdo->prepare(
        "UPDATE branch_operating_hours_tb 
        SET 
          start_time = ?, 
          end_time = ?, 
          is_closed = ?
        WHERE branch_id = ? AND day_of_week = ?"
    );

    foreach ($schedules as $s) {
        $stmt->execute([
            $s['start_time'] ?: null, 
            $s['end_time'] ?: null,
            $s['is_closed'],
            $branchId,
            $s['day_of_week']
        ]);
    }

    // 2. Update Branch General Status (Maintenance & Configuration)
    // We update is_configured only if mark_configured is sent as 1
    $updateBranchSql = "UPDATE clinic_branches_tb 
                        SET is_maintenance = ?, 
                            is_configured = CASE WHEN ? = 1 THEN 1 ELSE is_configured END 
                        WHERE branch_id = ?";
    
    $branchStmt = $pdo->prepare($updateBranchSql);
    $branchStmt->execute([$isMaintenance, $markConfigured, $branchId]);

    $pdo->commit();
    echo json_encode(["success" => true, "message" => "Settings updated successfully!"]);

} catch(Exception $e) {
    if (isset($pdo)) $pdo->rollBack();
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>