<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

try {
  $owner = validate_auth(['pet_owner']); 
  $userId = $owner->user_id ?? null;
  $petId = $_POST['pet_id'] ?? null;

  if(!$userId || !$petId) throw new Exception("Unauthorized or missing Pet ID.");

  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  // Verify Ownership
  $stmtCheck = $pdo->prepare("SELECT pet_picture FROM pet_tb WHERE pet_id = ? AND owner_id = ?");
  $stmtCheck->execute([$petId, $userId]);
  $oldPetData = $stmtCheck->fetch();
  if(!$oldPetData) throw new Exception("Unauthorized access.");

  // --- Sanitize and set NULL for empty optional fields ---
  $birthdate = !empty($_POST['birthdate']) ? $_POST['birthdate'] : null;
  $weight = (isset($_POST['weight']) && $_POST['weight'] !== '') ? $_POST['weight'] : null;
  $breed = !empty($_POST['breed']) ? $_POST['breed'] : null;
  $medical = !empty($_POST['medical_conditions']) ? $_POST['medical_conditions'] : null;

  $stmtUpdate = $pdo->prepare(
      "UPDATE pet_tb 
      SET name = :name, species = :species, breed = :breed, birthdate = :birthdate, 
          sex = :sex, weight = :weight, medical_conditions = :medical_conditions
      WHERE pet_id = :pet_id AND owner_id = :owner_id"
  );

  $stmtUpdate->execute([
      ':name'               => $_POST['name'] ?? '',
      ':species'            => $_POST['species'] ?? '',
      ':breed'              => $breed,
      ':birthdate'          => $birthdate,
      ':sex'                => $_POST['sex'] ?? '',
      ':weight'             => $weight,
      ':medical_conditions' => $medical,
      ':pet_id'             => $petId,
      ':owner_id'           => $userId
  ]);

  $newPicPath = null;
  if(isset($_FILES['pet_picture']) && $_FILES['pet_picture']['error'] === 0) {
      $file = $_FILES['pet_picture'];
      $baseDir = __DIR__ . '/../../../uploads/profile_pics/';
      if(!is_dir($baseDir)) mkdir($baseDir, 0777, true);

      $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
      $filename = "pet_" . $petId . "_" . uniqid() . "." . $ext;
      $fullPath = $baseDir . $filename;

      if(move_uploaded_file($file['tmp_name'], $fullPath)) {
          $newPicPath = "uploads/profile_pics/" . $filename;
          
          // Delete old file
          if (!empty($oldPetData['pet_picture'])) {
              $oldFilePath = __DIR__ . '/../../../' . $oldPetData['pet_picture'];
              if (file_exists($oldFilePath)) unlink($oldFilePath);
          }

          $pdo->prepare("UPDATE pet_tb SET pet_picture = ? WHERE pet_id = ?")->execute([$newPicPath, $petId]);
      }
  }

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Profile updated.", "new_image_path" => $newPicPath]);

} catch(Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}