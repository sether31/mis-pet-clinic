<?php
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';

$admin = validate_auth(['clinic_admin']); 

try {
    $pdo = (new Database())->pdo;

    // get branches
    // calculate days_left if active or expired 
    $stmt = $pdo->prepare(
        "SELECT 
          b.*, 
          s.end_date,
          s.status as sub_status,
          DATEDIFF(s.end_date, NOW()) as days_left
        FROM clinic_branches_tb b
        INNER JOIN clinics_tb c ON b.clinic_id = c.clinic_id
        LEFT JOIN (
          SELECT branch_id, end_date, status, created_at
          FROM branch_subscriptions_tb
          WHERE (branch_id, created_at) IN (
            SELECT branch_id, MAX(created_at)
            FROM branch_subscriptions_tb
            GROUP BY branch_id
          )
        ) s ON b.branch_id = s.branch_id
        WHERE c.created_by = :user_id
        ORDER BY b.status ASC, b.name ASC"
    );

    $stmt->execute([':user_id' => $admin->user_id]);
    $branches = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
      "success" => true, 
      "data" => $branches
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>