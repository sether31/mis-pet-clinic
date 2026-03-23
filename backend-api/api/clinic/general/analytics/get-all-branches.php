<?php
header("Access-Control-Allow-Origin: *");
header('Content-Type: application/json');

require_once __DIR__ . '/../../../../config/Database.php';

try {
$database = new Database();
$pdo = $database->pdo;

// Join with subscriptions to get the current plan status
$stmt = $pdo->prepare("
    SELECT 
      b.branch_id, 
      b.name, 
      b.municipality,
      s.status as sub_status,
      s.end_date as expiry
    FROM clinic_branches_tb b
    LEFT JOIN branch_subscriptions_tb s ON b.branch_id = s.branch_id
    WHERE b.status = 'approved'
    ORDER BY b.name ASC
");

$stmt->execute();
$branches = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(["success" => true, "data" => $branches]);

} catch (Exception $e) {
echo json_encode(["success" => false, "message" => $e->getMessage()]);
}