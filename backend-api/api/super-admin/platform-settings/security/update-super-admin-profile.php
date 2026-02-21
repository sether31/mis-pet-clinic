<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';

$admin = validate_auth(['super_admin']);
$userId = $admin->user_id; 

try {
  $pdo = (new Database())->pdo;
  $firstName = trim($_POST['first_name'] ?? '');
  $lastName = trim($_POST['last_name'] ?? '');

  if(empty($firstName) || empty($lastName)) {
    throw new Exception("First name and Last name are required.");
  }

  $stmtUser = $pdo->prepare("SELECT profile_picture FROM user_tb WHERE user_id = ?");
  $stmtUser->execute([$userId]);
  $currentUser = $stmtUser->fetch();

  if(!$currentUser) throw new Exception("User not found.");

  // update info
  $query = "UPDATE user_tb SET first_name = :fname, last_name = :lname";
  $params = [
    ':fname' => $firstName,
    ':lname' => $lastName,
    ':id' => $userId
  ];

  // handle image
  if(isset($_FILES['profile_pic']) && $_FILES['profile_pic']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['profile_pic'];
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if(!in_array($file['type'], $allowedTypes)) {
      throw new Exception("Invalid file type. Only JPG, PNG, and WebP are allowed.");
    }

    $uploadDir = __DIR__ . '/../../../../uploads/profile_pics/';
    if(!is_dir($uploadDir)) {
      mkdir($uploadDir, 0777, true);
    }

    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $fileName = 'profile_' . $userId . '_' . time() . '.' . $extension;
    $targetPath = $uploadDir . $fileName;

    if(move_uploaded_file($file['tmp_name'], $targetPath)) {
      $dbPath = 'uploads/profile_pics/' . $fileName;
      
      $query .= ", profile_picture = :img";
      $params[':img'] = $dbPath;

      // delete old physical
      if($currentUser['profile_picture']) {
        $oldFilePath = __DIR__ . '/../../../../' . $currentUser['profile_picture'];
        if(file_exists($oldFilePath)) {
          unlink($oldFilePath);
        }
      }
    } else {
      throw new Exception("Failed to upload image.");
    }
  }

  $query .= " WHERE user_id = :id";
  $stmt = $pdo->prepare($query);
  $stmt->execute($params);

  // audit update user profile
  log_audit($pdo, $userId, null, null, 'UPDATE', 'USER', $userId);

  echo json_encode([
    "success" => true, 
    "message" => "Profile updated successfully.",
  ]);
} catch(Exception $e) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}