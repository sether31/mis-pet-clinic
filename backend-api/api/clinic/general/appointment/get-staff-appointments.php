<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

// Protect the endpoint
$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);

header("Content-Type: application/json");

$staff_id = $_GET['staff_id'] ?? null;
$date = $_GET['date'] ?? null;

if (!$staff_id || !$date) {
    echo json_encode(["success" => false, "data" => [], "message" => "Parameters missing"]);
    exit;
}

try {
  // Using your unified Database class structure
  $pdo = (new Database())->pdo;

  // Fetch only start and end times for confirmed appointments on that day
  // Note: Use appointments_tb to match your create script
  $stmt = $pdo->prepare("
    SELECT start_time, end_time 
    FROM appointments_tb 
    WHERE staff_id = :staff_id 
    AND DATE(start_time) = :date
    AND status NOT IN ('cancelled', 'rejected')
    ORDER BY start_time ASC
  ");
  
  $stmt->execute([':staff_id' => $staff_id, ':date' => $date]);
  $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // Format for JS: [{start: "12:00", end: "13:00"}]
  $busy_slots = array_map(function($app) {
    return [
      "start" => date("H:i", strtotime($app['start_time'])),
      "end" => date("H:i", strtotime($app['end_time']))
    ];
  }, $appointments);

  echo json_encode([
    "success" => true, 
    "data" => $busy_slots
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false, 
    "message" => "Query Error: " . $e->getMessage()
  ]);
}