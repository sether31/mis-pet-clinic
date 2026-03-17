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
$markConfigured = isset($_POST['mark_configured']) ? (int)$_POST['mark_configured'] : 0;

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

  // 👇 2. SMART CHANGE DETECTOR 👇
  $hasChanges = false;
  $maintenanceChanged = false;
  $scheduleChanged = false;

  // Check maintenance
  if ((int)$branch['is_maintenance'] !== $isMaintenance) {
      $hasChanges = true;
      $maintenanceChanged = true;
  }
  
  // Check config status
  if ($markConfigured === 1 && (int)$branch['is_configured'] !== 1) {
      $hasChanges = true;
  }

  // Check schedules
  foreach ($schedules as $s) {
    $day = $s['day_of_week'];
    $curr = $currentSchedMap[$day] ?? null;

    if (!$curr) {
        $hasChanges = true;
        $scheduleChanged = true;
        break;
    }

    $start = empty($s['start_time']) ? null : $s['start_time'];
    $end = empty($s['end_time']) ? null : $s['end_time'];
    $isClosed = isset($s['is_closed']) ? (int)$s['is_closed'] : 1;

    $currStart = empty($curr['start_time']) ? null : substr($curr['start_time'], 0, 5);
    $currEnd = empty($curr['end_time']) ? null : substr($curr['end_time'], 0, 5);

    if ($start !== $currStart || $end !== $currEnd || $isClosed !== (int)$curr['is_closed']) {
      $hasChanges = true;
      $scheduleChanged = true;
      break; // Stop loop, we found a schedule change!
    }
  }

  if (!$hasChanges) {
      echo json_encode(["success" => true, "message" => "No changes were made.", "no_changes" => true]);
      exit; // Stops here, no DB updates
  }

  // 3. UPDATE SCHEDULES
  $stmt = $pdo->prepare(
    "UPDATE branch_operating_hours_tb 
    SET 
      start_time = ?, 
      end_time = ?, 
      is_closed = ?
    WHERE branch_id = ? AND day_of_week = ?"
  );

  foreach ($schedules as $s) {
    $day = $s['day_of_week'];
    $isClosed = isset($s['is_closed']) ? (int)$s['is_closed'] : 1;
    
    // Safely save old times even if closed!
    $curr = $currentSchedMap[$day] ?? [];
    $startTime = !empty($s['start_time']) ? $s['start_time'] : ($curr['start_time'] ?? null);
    $endTime   = !empty($s['end_time']) ? $s['end_time'] : ($curr['end_time'] ?? null);

    $stmt->execute([$startTime, $endTime, $isClosed, $branchId, $day]);
  }

  // Update branch maintenance and config
  $updateBranchSql = "UPDATE clinic_branches_tb 
                      SET is_maintenance = ?, 
                          is_configured = CASE WHEN ? = 1 THEN 1 ELSE is_configured END 
                      WHERE branch_id = ?";
  
  $branchStmt = $pdo->prepare($updateBranchSql);
  $branchStmt->execute([$isMaintenance, $markConfigured, $branchId]);

  log_audit($pdo, $userId, $branch['clinic_id'], $branchId, 'UPDATE', 'BRANCH_SETTINGS_OPERATIONAL', $branchId);

  // 👇 4. DYNAMIC NOTIFICATION WITH ROLE 👇
  $actorName = ucwords(trim($decodedToken->fname . ' ' . $decodedToken->lname));
  $branchName = ucwords($branch['name']);
  
  // Format the Role nicely
  $roleDisplay = ($userRole === 'clinic_admin') ? 'Clinic Admin' : 'Branch Admin';
  $actorWithRole = "{$roleDisplay} ({$actorName})";
  
  // Build the message based on what changed
  if (isset($maintenanceChanged) || isset($scheduleChanged)) {
    if ($maintenanceChanged && $scheduleChanged) {
      $maintText = $isMaintenance === 1 ? "enabled maintenance mode" : "disabled maintenance mode";
      $message = "{$actorWithRole} updated the operating hours and {$maintText} for {$branchName}.";
      $title = "Branch Schedule Updated: " . $branchName;
    } elseif ($maintenanceChanged) {
      $maintText = $isMaintenance === 1 ? "Enabled" : "Disabled";
      $title = "Branch Maintenance Mode {$maintText}: " . $branchName;
      $message = "{$actorWithRole} " . strtolower($maintText) . " maintenance mode for {$branchName}.";
    } else {
      $title = "Branch Schedule Updated: " . $branchName;
      $message = "{$actorWithRole} updated the operating hours for {$branchName}.";
    }
  } else {
    // Fallback
    $title = "Branch Profile Updated: " . $branchName;
    $message = "{$actorWithRole} updated the profile details for {$branchName}.";
  }

  // A. If Branch Admin did it -> Notify Clinic Admin
  if ($userRole === 'branch_admin') {
    send_notification($pdo, $branch['clinic_owner_id'], 'system', $title, $message);
  } 
  // B. If Clinic Admin did it -> Notify Branch Admin(s)
  elseif ($userRole === 'clinic_admin') {
    $stmtBranchAdmins = $pdo->prepare(
      "SELECT bs.user_id 
      FROM branch_staff_tb bs
      JOIN user_tb u ON bs.user_id = u.user_id
      WHERE bs.branch_id = ? 
        AND bs.status = 1"
    );
    $stmtBranchAdmins->execute([$branchId]);
    $branchAdmins = $stmtBranchAdmins->fetchAll();

    foreach ($branchAdmins as $ba) {
      if ($ba['user_id'] !== $branch['clinic_owner_id']) {
        send_notification($pdo, $ba['user_id'], 'system', $title, $message);
      }
    }
  }

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Settings updated successfully!"]);

} catch(Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>