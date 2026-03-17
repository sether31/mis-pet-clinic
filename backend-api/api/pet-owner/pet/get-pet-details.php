<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';


try {
  $owner = validate_auth(['pet_owner']); 
  $userId = $owner->user_id ?? null;

  if(!$userId) {
    throw new Exception("Unauthorized access. Please log in.");
  }

  // Get the pet ID
  $petId = $_GET['id'] ?? null;
  
  if(!$petId) {
    throw new Exception("Pet ID is missing.");
  }

  $pdo = (new Database())->pdo;

  // Fetch the pet data. 
  $stmt = $pdo->prepare(
    "SELECT pet_id, name, species, breed, birthdate, sex, weight, medical_conditions, pet_picture, is_deceased, status, deceased_date 
    FROM pet_tb 
    WHERE pet_id = :pet_id AND owner_id = :owner_id 
    LIMIT 1"
  );
  
  $stmt->execute([
    ':pet_id' => $petId,
    ':owner_id' => $userId
  ]);
  
  $pet = $stmt->fetch();

  if(!$pet) {
    throw new Exception("Pet not found or you do not have permission to view it.");
  }

  echo json_encode([
    "success" => true,
    "data" => $pet
  ]);

} catch(Exception $e) {
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
}
?>