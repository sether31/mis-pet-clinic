<?php
ob_clean();
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';

$decoded = validate_auth(['pet_owner']); 

try {
  $pdo = (new Database())->pdo;
  $branch_id = $_GET['branch_id'] ?? null;

  if (!$branch_id) throw new Exception("Missing branch ID.");

  $limitStmt = $pdo->prepare(
    "SELECT s.appointment_limit, bs.created_at as sub_start_date
    FROM branch_subscriptions_tb bs
    JOIN subscription_tb s ON bs.subscription_id = s.subscription_id
    WHERE bs.branch_id = ? AND bs.status = 'active'
    ORDER BY bs.created_at DESC LIMIT 1"
  );
  $limitStmt->execute([$branch_id]);
  $subData = $limitStmt->fetch();
  
  $limit = $subData ? (int)$subData['appointment_limit'] : 0;
  $sub_start_date = $subData ? $subData['sub_start_date'] : '2000-01-01 00:00:00';

  $is_full = false;

  if($limit > 0 && $limit < 1000) {
    $capStmt = $pdo->prepare(
      "SELECT COUNT(*) FROM appointments_tb 
      WHERE branch_id = ? 
      AND status NOT IN ('cancelled', 'rejected') 
      AND created_at >= ?"
    );
    $capStmt->execute([$branch_id, $sub_start_date]);
    $currentCount = (int)$capStmt->fetchColumn();

    if($currentCount >= $limit) {
      $is_full = true;
    }
  }

  echo json_encode([
    "success" => true, 
    "data" => [
      "is_full" => $is_full
    ]
  ]);

} catch (Throwable $e) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>