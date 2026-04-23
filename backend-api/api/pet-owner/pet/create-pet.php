<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../helper/log_audit.php';

try {
  $owner = validate_auth(['pet_owner']); 
  $userId = $owner->user_id ?? null;

  if(!$userId) throw new Exception("User ID is required.");

  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  // --- Helper to handle optional fields ---
  $name = !empty($_POST['name']) ? trim($_POST['name']) : null;
  $species = !empty($_POST['species']) ? trim($_POST['species']) : null;
  $sex = !empty($_POST['sex']) ? trim($_POST['sex']) : null;
  $breed = !empty($_POST['breed']) ? trim($_POST['breed']) : null;
  $medical = !empty($_POST['medical_conditions']) ? trim($_POST['medical_conditions']) : null;
  $weight = (isset($_POST['weight']) && $_POST['weight'] !== '') ? $_POST['weight'] : null;

  // --- Birthdate Logic (Handles both YYYY-MM-DD and MM/DD/YYYY) ---
  $rawDate = $_POST['birthdate'] ?? '';
  $sqlBirthdate = null;
  if (!empty($rawDate)) {
      if (strpos($rawDate, '/') !== false) {
          $parts = explode('/', $rawDate);
          if(count($parts) === 3) $sqlBirthdate = "{$parts[2]}-{$parts[0]}-{$parts[1]}";
      } else {
          $sqlBirthdate = $rawDate; // Already YYYY-MM-DD
      }
  }

  if (!$name || !$species || !$sex) {
      throw new Exception("Required fields (Name, Species, Sex) are missing.");
  }

  $stmtPet = $pdo->prepare(
      "INSERT INTO pet_tb (owner_id, name, species, breed, birthdate, sex, weight, medical_conditions) 
      VALUES (:owner_id, :name, :species, :breed, :birthdate, :sex, :weight, :medical_conditions)"
  );

  $stmtPet->execute([
      ':owner_id'           => $userId,
      ':name'               => $name,
      ':species'            => $species,
      ':breed'              => $breed,
      ':birthdate'          => $sqlBirthdate,
      ':sex'                => $sex,
      ':weight'             => $weight,
      ':medical_conditions' => $medical
  ]);

  $petId = $pdo->lastInsertId();

  // Image Upload Logic (remains same but uses $petId)
  function uploadPetPic($file, $petId) {
      if(!isset($file) || $file['error'] !== 0) return null;
      $baseDir = __DIR__ . '/../../../uploads/profile_pics/';
      if(!is_dir($baseDir)) mkdir($baseDir, 0777, true);

      $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
      $filename = "pet_" . $petId . "_" . uniqid() . "." . $ext;
      if(move_uploaded_file($file['tmp_name'], $baseDir . $filename)) {
          return "uploads/profile_pics/" . $filename;
      }
      return null;
  }

  $petPicPath = uploadPetPic($_FILES['pet_picture'] ?? null, $petId);
  if($petPicPath) {
      $pdo->prepare("UPDATE pet_tb SET pet_picture = ? WHERE pet_id = ?")->execute([$petPicPath, $petId]);
  }

  log_audit($pdo, $userId, null, null, 'CREATE', 'PET', $petId);
  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Pet profile created successfully!"]);

} catch(Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}