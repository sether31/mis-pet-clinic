<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';
// ADD THESE TWO HELPERS
require_once __DIR__ . '/../../../helper/send_notification.php';
require_once __DIR__ . '/../../../helper/send_status_email.php';

$admin = validate_auth(['super_admin']);
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->branch_id) || !isset($data->status)) {
  echo json_encode(["success" => false, "message" => "Required data missing."]);
  exit();
}

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction(); // Use transaction for safety

  // 1. Fetch Owner and Branch Info (Needed for the notification/email)
  $stmtInfo = $pdo->prepare("
      SELECT 
          b.name as branch_name, 
          c.created_by as owner_id,
          u.email as owner_email,
          CONCAT(u.first_name, ' ', u.last_name) as owner_name
      FROM clinic_branches_tb b
      JOIN clinics_tb c ON b.clinic_id = c.clinic_id
      JOIN user_tb u ON c.created_by = u.user_id
      WHERE b.branch_id = ?
  ");
  $stmtInfo->execute([$data->branch_id]);
  $info = $stmtInfo->fetch();

  if (!$info) throw new Exception("Branch information not found.");

  // 2. Normalize Status
  $cleanStatus = strtolower(trim($data->status));
  $feedback = trim($data->feedback ?? '');

  // 3. Update the Database
  $stmt = $pdo->prepare(
      "UPDATE clinic_branches_tb 
      SET status = :status, feedback = :feedback
      WHERE branch_id = :branch_id"
  );
  $stmt->execute([
      ':status' => $cleanStatus,
      ':feedback' => $feedback, 
      ':branch_id' => $data->branch_id
  ]);

  // 4. Prepare Notification Content
  $cleanBranch = ucwords(strtolower($info['branch_name']));
  $notifCategory = "clinic_status_update";

  if ($cleanStatus === 'suspended') {
      $title = "Branch Suspended: $cleanBranch";
      $message = "Your branch '$cleanBranch' has been suspended. Feedback: " . ($feedback ?: "No specific details provided.");
  } else {
      $title = "Branch Reactivated: $cleanBranch";
      $message = "Your branch '$cleanBranch' has been reactivated.";
  }

  // 5. Send IN-APP Notification
  send_notification($pdo, $info['owner_id'], $notifCategory, $title, $message);

  // 6. Send EMAIL Notification
  if (!empty($info['owner_email'])) {
      sendBranchStatusEmail(
          $info['owner_email'], 
          $info['owner_name'], 
          $info['branch_name'], 
          $cleanStatus, 
          $feedback
      );
  }

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Clinic records updated and owner notified."]);

} catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}