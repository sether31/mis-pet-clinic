<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../helper/log_audit.php';

try {
  $owner = validate_auth(['pet_owner']); 
  $userId = $owner->user_id ?? null;

  if(!$userId) {
    throw new Exception("User ID is required. Please log in.");
  }

  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  // Birthdate
  $rawDate = $_POST['birthdate'] ?? '';
  $sqlBirthdate = null;
  if($rawDate) {
    $dateParts = explode('/', $rawDate);
    if(count($dateParts) === 3) {
      $sqlBirthdate = $dateParts[2] . '-' . $dateParts[0] . '-' . $dateParts[1];
    }
  }

  // Insert Pet
  $stmtPet = $pdo->prepare(
    "INSERT INTO pet_tb (owner_id, name, species, breed, birthdate, sex, weight, medical_conditions) 
    VALUES (:owner_id, :name, :species, :breed, :birthdate, :sex, :weight, :medical_conditions)"
  );

  $stmtPet->execute([
    ':owner_id' => $userId,
    ':name' => $_POST['name'] ?? '',
    ':species' => $_POST['species'] ?? '',
    ':breed' => $_POST['breed'] ?? '',
    ':birthdate' => $sqlBirthdate,
    ':sex' => $_POST['sex'] ?? '',
    ':weight' => $_POST['weight'] ?? null,
    ':medical_conditions' => $_POST['medical_conditions'] ?? null
  ]);

  $petId = $pdo->lastInsertId();

  // Image Upload
  function uploadPetPic($file, $petId) {
    if(!isset($file) || $file['error'] !== 0) return null;

    // Target the base profile_pics folder
    $baseDir = __DIR__ . '/../../../uploads/profile_pics/';
    
    if(!is_dir($baseDir)) {
      mkdir($baseDir, 0777, true);
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = "pet_" . $petId . "_" . uniqid() . "." . $ext;
    $fullPath = $baseDir . $filename;

    if(move_uploaded_file($file['tmp_name'], $fullPath)) {
      return "uploads/profile_pics/" . $filename;
    }
    return null;
  }

  $petPicPath = uploadPetPic($_FILES['pet_picture'] ?? null, $petId);

  // Update path in database
  if($petPicPath) {
    $stmtUpdate = $pdo->prepare("UPDATE pet_tb SET pet_picture = ? WHERE pet_id = ?");
    $stmtUpdate->execute([$petPicPath, $petId]);
  }

  // Audit Log
  log_audit($pdo, $userId, null, null, 'CREATE', 'PET', $petId);

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Pet profile created successfully!"]);

} catch(Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) {
    $pdo->rollBack();
  }
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>