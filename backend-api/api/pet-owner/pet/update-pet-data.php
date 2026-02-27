<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

try {
  $owner = validate_auth(['pet_owner']); 
  $userId = $owner->user_id ?? null;

  if(!$userId) {
    throw new Exception("Unauthorized access.");
  }

  $petId = $_POST['pet_id'] ?? null;
  if(!$petId) {
    throw new Exception("Pet ID is missing.");
  }

  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  // Verify Ownership & Get Old Data 
  $stmtCheck = $pdo->prepare("SELECT pet_picture FROM pet_tb WHERE pet_id = :pet_id AND owner_id = :owner_id LIMIT 1");
  $stmtCheck->execute([':pet_id' => $petId, ':owner_id' => $userId]);
  $oldPetData = $stmtCheck->fetch();

  if(!$oldPetData) {
    throw new Exception("Pet not found or unauthorized.");
  }

  // Update Basic Text Information
  $stmtUpdate = $pdo->prepare(
    "UPDATE pet_tb 
    SET name = :name, species = :species, breed = :breed, birthdate = :birthdate, 
      sex = :sex, weight = :weight, medical_conditions = :medical_conditions
    WHERE pet_id = :pet_id AND owner_id = :owner_id"
  );

  $stmtUpdate->execute([
    ':name' => $_POST['name'] ?? '',
    ':species' => $_POST['species'] ?? '',
    ':breed' => $_POST['breed'] ?? '',
    ':birthdate' => $_POST['birthdate'] ?? null,
    ':sex' => $_POST['sex'] ?? '',
    ':weight' => $_POST['weight'] ?? null,
    ':medical_conditions' => $_POST['medical_conditions'] ?? null,
    ':pet_id' => $petId,
    ':owner_id' => $userId
  ]);

  $newPicPath = null;
  
  if(isset($_FILES['pet_picture']) && $_FILES['pet_picture']['error'] === 0) {
    $file = $_FILES['pet_picture'];
    
    $baseDir = __DIR__ . '/../../../uploads/profile_pics/';
    
    if(!is_dir($baseDir)) {
      mkdir($baseDir, 0777, true);
    }

    // Generate new filename
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = "pet_" . $petId . "_" . uniqid() . "." . $ext;
    $fullPath = $baseDir . $filename;

    if(move_uploaded_file($file['tmp_name'], $fullPath)) {
      $newPicPath = "uploads/profile_pics/" . $filename;
      
      // unlink the old image from the server 
      if (!empty($oldPetData['pet_picture'])) {
        // Build the absolute path to the old image using __DIR__
        $oldFilePath = __DIR__ . '/../../../' . $oldPetData['pet_picture'];
        
        if (file_exists($oldFilePath) && is_file($oldFilePath)) {
          unlink($oldFilePath); // Deletes the file
        }
      }

      // Update database with new image path
      $stmtImg = $pdo->prepare("UPDATE pet_tb SET pet_picture = :pet_picture WHERE pet_id = :pet_id");
      $stmtImg->execute([
        ':pet_picture' => $newPicPath,
        ':pet_id' => $petId
      ]);
    } else {
      error_log("Failed to move updated file to: " . $fullPath);
    }
  }

  $pdo->commit();
  
  echo json_encode([
    "success" => true, 
    "message" => "Profile updated.",
    "new_image_path" => $newPicPath 
  ]);

} catch(Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) {
    $pdo->rollBack();
  }
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>