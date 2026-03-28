<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php'; 
require_once __DIR__ . '/../../../config/Database.php';

// Validate the pet_owner session
$decoded = validate_auth(['pet_owner']); 

try {
  $database = new Database();
  $pdo = $database->pdo;
  
  // Get the ID from the query string
  $branch_service_id = $_GET['branch_service_id'] ?? null;

  if (!$branch_service_id) {
      throw new Exception("Branch Service ID is required.");
  }

  /* Optimized Query: 
      Removed JOIN to service_tb. 
      Using custom_name and custom_description directly.
  */
  $stmt = $pdo->prepare(
    "SELECT 
        branch_service_id,
        branch_id,
        custom_name, 
        custom_description,
        price,
        duration,
        status
    FROM branch_service_tb 
    WHERE branch_service_id = ? 
    AND status = 1"
  );
  
  $stmt->execute([$branch_service_id]);
  $service = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$service) {
      // Handle case where service doesn't exist or is inactive
      http_response_code(404);
      echo json_encode(["success" => false, "message" => "Service not found or inactive."]);
      exit;
  }

  // Return the clean data
  echo json_encode([
      "success" => true, 
      "data" => $service
  ]);

} catch(Exception $e) {
  http_response_code(500);
  echo json_encode([
      "success" => false, 
      "message" => $e->getMessage()
  ]);
}
?>