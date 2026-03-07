<?php
ob_clean();
error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED);
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

// Define the root directory of your project and the specific avatar upload folder
$rootDir = __DIR__ . '/../../../';
$uploadDir = $rootDir . 'uploads/profile_pics/'; 

$decoded = validate_auth(['pet_owner']);

try {
  $pdo = (new Database())->pdo;
  $user_id = $decoded->user_id;

  $pdo->beginTransaction();

  // Fetch old profile data to get the old picture path
  $stmtCheck = $pdo->prepare("SELECT profile_picture FROM user_tb WHERE user_id = ? LIMIT 1");
  $stmtCheck->execute([$user_id]);
  $oldUserData = $stmtCheck->fetch();

  if (!$oldUserData) {
    throw new Exception("User not found.");
  }

  // Validate Text Fields
  $first_name = $_POST['first_name'] ?? null;
  $last_name = $_POST['last_name'] ?? null;
  $phone_number = isset($_POST['phone_number']) ? (string)$_POST['phone_number'] : null;

  if (!$first_name) {
    throw new Exception("First name is required.");
  }

  if (!$last_name) {
    throw new Exception("Last name is required.");
  }

  // Handle Image Upload & Deletion of Old Image
  $profile_picture_path = null;

  if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] === UPLOAD_ERR_OK) {
    
    if (!is_dir($uploadDir)) {
      mkdir($uploadDir, 0755, true);
    }

    $fileTmpPath = $_FILES['profile_picture']['tmp_name'];
    $fileName = $_FILES['profile_picture']['name'];
    $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

    $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    if (!in_array($fileExtension, $allowedExtensions)) {
      throw new Exception("Invalid file type. Only JPG, PNG, and WEBP allowed.");
    }

    // Generate unique filename
    $newFileName = 'user_' . $user_id . '_' . time() . '.' . $fileExtension;
    $destPath = $uploadDir . $newFileName;

    // Move the new file
    if (move_uploaded_file($fileTmpPath, $destPath)) {
      // The relative path that gets saved to the database
      $profile_picture_path = '/uploads/profile_pics/' . $newFileName; 
      
      // DELETE THE OLD IMAGE FROM THE SERVER
      if (!empty($oldUserData['profile_picture'])) {
        // Combine root dir with the old relative path
        $oldFilePath = rtrim($rootDir, '/') . $oldUserData['profile_picture'];
        
        // Verify it exists and is actually a file before deleting
        if (file_exists($oldFilePath) && is_file($oldFilePath)) {
        unlink($oldFilePath); 
        }
      }
    } else {
      throw new Exception("There was an error saving the image.");
    }
  }

  // Update Database
  if ($profile_picture_path) {
    // Update with new picture
    $stmt = $pdo->prepare("UPDATE user_tb SET first_name = ?, last_name = ?, phone_number = ?, profile_picture = ?, updated_at = NOW() WHERE user_id = ?");
    $stmt->execute([$first_name, $last_name, $phone_number, $profile_picture_path, $user_id]);
  } else {
    // Update text only
    $stmt = $pdo->prepare("UPDATE user_tb SET first_name = ?, last_name = ?, phone_number = ?, updated_at = NOW() WHERE user_id = ?");
    $stmt->execute([$first_name, $last_name, $phone_number, $user_id]);
  }

  $pdo->commit();

  echo json_encode([
    "success" => true, 
    "message" => "Profile updated successfully!",
    "new_image_path" => $profile_picture_path 
  ]);

} catch(Exception $e) {
  if(isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>