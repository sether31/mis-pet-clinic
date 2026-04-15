<?php
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';

$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 
$pdo = (new Database())->pdo;
$branch_id = $_GET['branch_id'] ?? null;

if (!$branch_id) {
    echo json_encode(["success" => false, "message" => "Branch ID required"]);
    exit;
}

try {
    $query = "
        SELECT DISTINCT
            u.user_id,
            CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
            u.email,
            u.phone_number,
            u.profile_picture,
            b.name AS branch_name, -- Added: Fetch the branch name once here
            (
                SELECT COUNT(DISTINCT p_inner.pet_id) 
                FROM pet_tb p_inner
                INNER JOIN appointments_tb a_inner ON p_inner.pet_id = a_inner.pet_id
                INNER JOIN medrecord_tb m_inner ON a_inner.appointment_id = m_inner.appointment_id
                WHERE p_inner.owner_id = u.user_id 
                AND a_inner.branch_id = :branch_id
            ) AS pet_count
        FROM user_tb u
        INNER JOIN appointments_tb a ON u.user_id = a.user_id
        INNER JOIN medrecord_tb m ON a.appointment_id = m.appointment_id
        INNER JOIN clinic_branches_tb b ON a.branch_id = b.branch_id -- Join to get branch info
        WHERE a.branch_id = :branch_id 
        ORDER BY owner_name ASC
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute([':branch_id' => $branch_id]);
    $owners = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["success" => true, "data" => $owners]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}