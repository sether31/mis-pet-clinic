<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';

validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']); 

header('Content-Type: application/json');

$branch_id = $_GET['branch_id'] ?? null;

if(!$branch_id) {
  echo json_encode(["success" => false, "message" => "Branch ID is required"]);
  exit;
}

try {
  $pdo = (new Database())->pdo;

  $stmt = $pdo->prepare(
    "SELECT 
      u.user_id, 
      u.profile_picture,
      u.first_name as fname, 
      u.last_name as lname, 
      u.email, 
      u.role_id, 
      u.profile_picture as profile_pic,
      r.role_name,
      bs.staff_id,
      bs.branch_id,
      bs.permissions,
      bs.status
    FROM user_tb u
    JOIN roles_tb r ON u.role_id = r.role_id
    JOIN branch_staff_tb bs ON u.user_id = bs.user_id
    WHERE bs.branch_id = :branch_id"
  );
  $stmt->execute([':branch_id' => $branch_id]);
  $staff = $stmt->fetchAll();

  // get schedules and filter branch_id via staff_id
  $schedStmt = $pdo->prepare(
    "SELECT sch.staff_id, sch.day_of_week, sch.is_available, sch.start_time, sch.end_time 
    FROM branch_staff_schedule_tb sch
    JOIN branch_staff_tb bs ON sch.staff_id = bs.staff_id
    WHERE bs.branch_id = :branch_id"
  );
  $schedStmt->execute([':branch_id' => $branch_id]);
  $allSchedules = $schedStmt->fetchAll();

  // group schedules by staff_id
  $schedulesByStaff = [];
  foreach ($allSchedules as $s) {
    $schedulesByStaff[$s['staff_id']][$s['day_of_week']] = [
      'is_workday' => (bool)$s['is_available'],
      'start' => substr($s['start_time'], 0, 5), 
      'end' => substr($s['end_time'], 0, 5)
    ];
  }

  $currentDay = date('l');

  // initialize card data
  $cardData = [
    "total" => count($staff),
    "active" => 0,
    "branch_admin" => 0,
    "vets" => 0,
    "groomers" => 0,
    "staff" => 0,
    "onDuty" => 0 
  ];

  foreach($staff as &$member) {
    $staffID = $member['staff_id'];
    $member['schedule'] = $schedulesByStaff[$staffID] ?? (object)[];
    $member['permissions'] = json_decode($member['permissions'] ?? '[]') ?: [];
    
    $isActive = (int)$member['status'] === 1;

    // count active
    if($isActive) {
      $cardData['active']++; 
      // count on duty today
      if(isset($schedulesByStaff[$staffID][$currentDay])) {
        $todaySched = $schedulesByStaff[$staffID][$currentDay];
        if($todaySched['is_workday'] === true) {
          $cardData['onDuty']++;
        }
      }
    }

    // count roles
    $role = strtolower($member['role_name']);
    if(str_contains($role, 'manager') || str_contains($role, 'admin')) {
      $cardData['branch_admin']++;
    } elseif(str_contains($role, 'veterinarian')) {
      $cardData['vets']++;
    } elseif(str_contains($role, 'groomer')) {
      $cardData['groomers']++;
    } else {
      $cardData['staff']++;
    }
  }

  echo json_encode([
    "success" => true,
    "data" => $staff,
    "cardData" => $cardData 
  ]);
} catch(Exception $e) {
  echo json_encode([
    "success" => false,
    "message" => "Database error: " . $e->getMessage()
  ]);
}