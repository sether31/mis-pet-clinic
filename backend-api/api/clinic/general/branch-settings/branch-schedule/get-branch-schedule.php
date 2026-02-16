<?php
require_once __DIR__ . '/../../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../../config/Database.php';

$decodedToken = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$branchId = $_GET['branch_id'] ?? null; 

if(!$branchId) {
  echo json_encode(["success" => false, "message" => "Branch ID required."]);
  exit;
}

try {
  $pdo = (new Database())->pdo;

  $branchStmt = $pdo->prepare("SELECT is_maintenance FROM clinic_branches_tb WHERE branch_id = ?");
  $branchStmt->execute([$branchId]);
  $branchStatus = $branchStmt->fetch();

  if (!$branchStatus) {
    echo json_encode(["success" => false, "message" => "Branch not found."]);
    exit;
  }

  $stmt = $pdo->prepare(
    "SELECT 
      boh_id, 
      day_of_week, 
      TIME_FORMAT(start_time, '%H:%i') AS start_time,
      TIME_FORMAT(end_time, '%H:%i') AS end_time, 
      is_closed 
    FROM branch_operating_hours_tb 
    WHERE branch_id = ? 
    ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')"
  );
  $stmt->execute([$branchId]);
  $schedule = $stmt->fetchAll();

  $subStmt = $pdo->prepare(
    "SELECT 
      bs.subscription_id,
      bs.start_date,
      bs.end_date,
      s.name as plan_name,
      s.appointment_limit,
      s.price
    FROM branch_subscriptions_tb bs
    JOIN subscription_tb s ON bs.subscription_id = s.subscription_id
    WHERE bs.branch_id = ? AND bs.status = 'active'
    LIMIT 1"
  );
  $subStmt->execute([$branchId]);
  $subscription = $subStmt->fetch();

  $usageCount = 0;
  if($subscription) {
    $usageStmt = $pdo->prepare(
        "SELECT COUNT(*) as total 
        FROM appointments_tb 
        WHERE branch_id = ? 
        AND status NOT IN ('cancelled', 'rejected')
        AND DATE(created_at) >= DATE(?)" 
    );
    $usageStmt->execute([$branchId, $subscription['start_date']]);
    $row = $usageStmt->fetch();
    $usageCount = $row['total'] ?? 0;
  }

  echo json_encode([
    "success" => true, 
    "data" => [
      "is_maintenance" => $branchStatus['is_maintenance'],
      "schedules" => $schedule,
      "subscription" => $subscription ? [
        "plan_name" => $subscription['plan_name'],
        "end_date" => $subscription['end_date'],
        "appointment_limit" => (int)$subscription['appointment_limit'],
        "current_usage" => (int)$usageCount,
        "price" => $subscription['price']
      ] : null
    ]
  ]);

} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>