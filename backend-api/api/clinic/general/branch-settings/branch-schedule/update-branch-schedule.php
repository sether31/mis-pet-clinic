<?php
require_once __DIR__ . '/../../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../../config/Database.php';
require_once __DIR__ . '/../../../../../helper/log_audit.php';
require_once __DIR__ . '/../../../../../helper/send_notification.php';

$decodedToken = validate_auth(['clinic_admin', 'branch_admin']);
$userId = $decodedToken->user_id;
$userRole = $decodedToken->role;

$branchId = $_POST['branch_id'] ?? null;
$schedulesJson = $_POST['schedules'] ?? null;
$isMaintenance = isset($_POST['is_maintenance']) ? (int)$_POST['is_maintenance'] : 0;

if(!$branchId || !$schedulesJson) {
  echo json_encode(["success" => false, "message" => "Missing required data."]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  $schedules = json_decode($schedulesJson, true);

  // 1. FETCH CURRENT DATA
  $stmtBranch = $pdo->prepare("
    SELECT b.is_maintenance, b.is_configured, b.name, b.clinic_id, c.created_by as clinic_owner_id
    FROM clinic_branches_tb b
    JOIN clinics_tb c ON b.clinic_id = c.clinic_id
    WHERE b.branch_id = ? FOR UPDATE
  ");
  $stmtBranch->execute([$branchId]);
  $branch = $stmtBranch->fetch();

  if (!$branch) {
    echo json_encode(["success" => false, "message" => "Branch not found."]);
    exit;
  }

  $stmtSched = $pdo->prepare("SELECT day_of_week, start_time, end_time, is_closed FROM branch_operating_hours_tb WHERE branch_id = ?");
  $stmtSched->execute([$branchId]);
  $currentSchedules = $stmtSched->fetchAll(PDO::FETCH_ASSOC);

  $currentSchedMap = [];
  foreach($currentSchedules as $cs) {
    $currentSchedMap[$cs['day_of_week']] = $cs;
  }

  // 2. SMART CHANGE DETECTOR
  $hasChanges = false;
  $maintenanceChanged = false;
  $scheduleChanged = false;

  if ((int)$branch['is_maintenance'] !== $isMaintenance) {
      $hasChanges = true;
      $maintenanceChanged = true;
  }
  
  if ((int)$branch['is_configured'] !== 1) {
      $hasChanges = true;
  }

  foreach ($schedules as $s) {
    $day = $s['day_of_week'];
    $curr = $currentSchedMap[$day] ?? null;

    if (!$curr) {
        $hasChanges = true;
        $scheduleChanged = true;
        break;
    }

    $start = empty($s['start_time']) ? null : substr($s['start_time'], 0, 5);
    $end = empty($s['end_time']) ? null : substr($s['end_time'], 0, 5);
    $isClosed = isset($s['is_closed']) ? (int)$s['is_closed'] : 1;
    $currStart = empty($curr['start_time']) ? null : substr($curr['start_time'], 0, 5);
    $currEnd = empty($curr['end_time']) ? null : substr($curr['end_time'], 0, 5);

    if ($start !== $currStart || $end !== $currEnd || $isClosed !== (int)$curr['is_closed']) {
      $hasChanges = true;
      $scheduleChanged = true;
      break; 
    }
  }

  if (!$hasChanges) {
      echo json_encode(["success" => true, "message" => "No changes were made.", "no_changes" => true]);
      exit; 
  }

  // AUTO-MAINTENANCE LOGIC
  $autoMaintTriggered = false;
  if ($scheduleChanged) {
      $isMaintenance = 1;
      $autoMaintTriggered = true;
  }

  // 3. UPDATE SCHEDULES
  $stmt = $pdo->prepare("UPDATE branch_operating_hours_tb SET start_time = ?, end_time = ?, is_closed = ? WHERE branch_id = ? AND day_of_week = ?");
  foreach ($schedules as $s) {
    $day = $s['day_of_week'];
    $isClosed = isset($s['is_closed']) ? (int)$s['is_closed'] : 1;
    $curr = $currentSchedMap[$day] ?? [];
    $startTime = !empty($s['start_time']) ? $s['start_time'] : ($curr['start_time'] ?? null);
    $endTime   = !empty($s['end_time']) ? $s['end_time'] : ($curr['end_time'] ?? null);
    $stmt->execute([$startTime, $endTime, $isClosed, $branchId, $day]);
  }

  // Update branch maintenance and config
  $updateBranchSql = "UPDATE clinic_branches_tb 
                    SET is_maintenance = ?, 
                        is_configured = 1 
                    WHERE branch_id = ?";
                    
  $branchStmt = $pdo->prepare($updateBranchSql);
  $branchStmt->execute([$isMaintenance, $branchId]);

  log_audit($pdo, $userId, $branch['clinic_id'], $branchId, 'UPDATE', 'BRANCH_SETTINGS_OPERATIONAL', $branchId);

// 4. NOTIFICATIONS logic
  $actorName = ucwords(trim($decodedToken->fname . ' ' . $decodedToken->lname));
  $branchName = ucwords($branch['name']);
  $roleDisplay = ucwords(str_replace('_', ' ', $userRole));
  
  // Prepare the maintenance word (enabled/disabled)
  $maintWord = ($isMaintenance === 1) ? "enabled" : "disabled";
  $actionText = "";
  $title = "";

  // 👇 DYNAMIC LOGIC: If schedule changed, it's ALWAYS "Schedule & Maintenance" 👇
  if ($scheduleChanged) {
    $title = "Schedule & Maintenance Updated";
    $actionText = "updated the operating hours and " . ($autoMaintTriggered ? "automatically " : "") . "{$maintWord} maintenance mode";
  } 
  // If only the manual toggle was flipped
  elseif ($maintenanceChanged) {
      $title = "Maintenance Mode " . ucwords($maintWord);
      $actionText = "{$maintWord} maintenance mode";
  } 
  else {
      $title = "Branch Settings Updated";
      $actionText = "updated the branch settings";
  }

  // Final sentence construction
  $message = "{$roleDisplay} ({$actorName}) {$actionText} for {$branchName}.";

  // --- Notification Routing ---

  // A. If Branch Admin did it -> Notify Clinic Admin
  if ($userRole === 'branch_admin' && $userId !== $branch['clinic_owner_id']) {
      send_notification($pdo, $branch['clinic_owner_id'], 'system', $title, $message);
  } 

  // B. If Clinic Admin did it -> Notify all Branch Admins
  elseif ($userRole === 'clinic_admin') {
      $stmtAdmins = $pdo->prepare("
          SELECT bs.user_id FROM branch_staff_tb bs
          JOIN user_tb u ON bs.user_id = u.user_id
          JOIN roles_tb r ON u.role_id = r.role_id
          WHERE bs.branch_id = ? AND r.role_name = 'branch_admin'
          AND bs.status = 1 AND bs.user_id != ?
      ");
      $stmtAdmins->execute([$branchId, $userId]);
      $branchAdmins = $stmtAdmins->fetchAll();

      foreach ($branchAdmins as $admin) {
          send_notification($pdo, $admin['user_id'], 'system', $title, $message);
      }
  }
  $pdo->commit();
  echo json_encode([
    "success" => true, 
    "message" => "Settings updated successfully!",
    "auto_maintenance" => $autoMaintTriggered 
  ]);

} catch(Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>