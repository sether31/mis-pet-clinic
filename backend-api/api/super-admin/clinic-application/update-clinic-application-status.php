<?php
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../helper/send_notification.php';
// IMPORTANT: Include your new email helper file here
require_once __DIR__ . '/../../../helper/send_status_email.php'; 

$admin = validate_auth(['super_admin']);

try {
    $pdo = (new Database())->pdo;
    $data = json_decode(file_get_contents('php://input'));

    if(!$data || !isset($data->branch_id) || !isset($data->status)) {
        throw new Exception("Missing required data (branch_id or status)");
    }

    $pdo->beginTransaction();

    // 1. Fetch Branch Name, Owner ID, and Owner Email/Name
    // We added the JOIN to user_tb to get their contact info
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

    if (!$info) throw new Exception("Branch or Clinic Owner not found.");

    $currentStatus = strtolower(trim($data->status));

    // 2. Update Branch Status and Feedback
    $stmt = $pdo->prepare(
        "UPDATE clinic_branches_tb 
        SET status = :status, feedback = :feedback
        WHERE branch_id = :id"
    );
    $stmt->execute([
        ':status' => $currentStatus,
        ':feedback' => $data->feedback ?? '',
        ':id' => $data->branch_id
    ]);

    // 3. Auto-approve the Owner's account on first branch approval
    if($currentStatus === 'approved') {
        $userStmt = $pdo->prepare("UPDATE user_tb SET status = 'approved' WHERE user_id = ?");
        $userStmt->execute([$info['owner_id']]);
    }

    // 4. Send IN-APP Notification to the Clinic Admin
    $cleanBranch = ucwords(strtolower($info['branch_name']));
    $feedback = trim($data->feedback ?? '');
    $notifCategory = "clinic_application_request";

    if ($currentStatus === 'approved') {
        $title = "Branch Approved: $cleanBranch";
        $message = "Great news! Your application for '$cleanBranch' has been approved. The branch is now active and ready for setup.";
    } elseif ($currentStatus === 'suspended') {
        $title = "Branch Suspended: $cleanBranch";
        $message = "Your branch '$cleanBranch' has been suspended. Feedback: " . ($feedback ?: "No specific feedback provided.");
    } else {
        $title = "Action Required: $cleanBranch Rejected";
        $message = "Your application for '$cleanBranch' was not approved. Please review the feedback and resubmit. Feedback: " . ($feedback ?: "No specific feedback provided.");
    }

    send_notification($pdo, $info['owner_id'], $notifCategory, $title, $message);

    // 5. Send EMAIL Notification to the Clinic Admin
    // We pass the data we fetched from user_tb
    if (!empty($info['owner_email'])) {
        sendBranchStatusEmail(
            $info['owner_email'], 
            $info['owner_name'], 
            $info['branch_name'], 
            $currentStatus, 
            $data->feedback
        );
    }

    $pdo->commit();
    echo json_encode(["success" => true, "message" => "Status updated, Admin notified in-app and via email."]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>