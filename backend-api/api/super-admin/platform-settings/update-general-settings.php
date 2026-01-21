<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

$admin = validate_auth(['super_admin']);

try {
  $pdo = (new Database())->pdo;

  $name = $_POST['platform_name'] ?? null;
  $email = $_POST['platform_email'] ?? null;
  $phone = $_POST['contact_phone'] ?? null;
  $is_maintenance = (isset($_POST['is_maintenance']) && ($_POST['is_maintenance'] === '1' || $_POST['is_maintenance'] === 'true')) ? 1 : 0;

  if(!$name || !$email || !$phone) {
    throw new Exception("Platform name, email and contact number are required");
  }

  $logo_path = null;
  $logo_query = "";

  if(isset($_FILES['platform_logo']) && $_FILES['platform_logo']['error'] === UPLOAD_ERR_OK) {
    $upload_dir = dirname(__DIR__, 3) . "/uploads/platform/";
    if(!is_dir($upload_dir)) {
      mkdir($upload_dir, 0777, true);
    }

    $file_ext = pathinfo($_FILES['platform_logo']['name'], PATHINFO_EXTENSION);
    $filename = "logo_" . uniqid() . "." . $file_ext;
    $full_path = $upload_dir . $filename;

    if (move_uploaded_file($_FILES['platform_logo']['tmp_name'], $full_path)) {
      $logo_path = "uploads/platform/" . $filename;
      $logo_query = ", platform_logo = :logo";
    }
  }

  $stmt = $pdo->prepare(
    "UPDATE platform_settings_tb 
    SET 
      platform_name = :name, 
      platform_email = :email, 
      contact_phone = :phone, 
      is_maintenance = :maintenance
      $logo_query 
    WHERE ps_id = 1"
  );

  $params = [
    ':name' => $name,
    ':email' => $email,
    ':phone' => $phone,
    ':maintenance' => $is_maintenance
  ];

  if($logo_path) {
    $params[':logo'] = $logo_path;
  }

  $stmt->execute($params);

  echo json_encode([
    "success" => true,
    "message" => "Platform settings updated successfully"
  ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      "success" => false,
      "message" => $e->getMessage()
    ]);
}