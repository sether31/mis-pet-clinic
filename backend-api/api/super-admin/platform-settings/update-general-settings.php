<?php
require_once __DIR__ . '/../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../config/Database.php';

$admin = validate_auth(['super_admin']);

try {
  $pdo = (new Database())->pdo;

  // 1. GET CURRENT SETTINGS (To find old file paths for unlinking)
  $currentStmt = $pdo->query("SELECT platform_logo, login_photo FROM platform_settings_tb WHERE ps_id = 1");
  $currentSettings = $currentStmt->fetch();

  $name = $_POST['platform_name'] ?? null;
  $email = $_POST['platform_email'] ?? null;
  $phone = $_POST['contact_phone'] ?? null;
  $is_maintenance = (isset($_POST['is_maintenance']) && ($_POST['is_maintenance'] === '1' || $_POST['is_maintenance'] === 'true')) ? 1 : 0;
  $maintenance_message = $_POST['maintenance_message'] ?? null; 

  if(!$name || !$email || !$phone) {
    throw new Exception("Platform name, email and contact number are required");
  }

  $upload_dir = dirname(__DIR__, 3) . "/uploads/platform/";
  if(!is_dir($upload_dir)) {
    mkdir($upload_dir, 0777, true);
  }

  // 2. HANDLE PLATFORM LOGO
  $logo_path = null;
  $logo_query = "";
  if(isset($_FILES['platform_logo']) && $_FILES['platform_logo']['error'] === UPLOAD_ERR_OK) {
    // Delete old logo if it exists
    if (!empty($currentSettings['platform_logo'])) {
        $old_logo = dirname(__DIR__, 3) . "/" . $currentSettings['platform_logo'];
        if (file_exists($old_logo)) unlink($old_logo);
    }

    $file_ext = pathinfo($_FILES['platform_logo']['name'], PATHINFO_EXTENSION);
    $filename = "logo_" . uniqid() . "." . $file_ext;
    $full_path = $upload_dir . $filename;

    if (move_uploaded_file($_FILES['platform_logo']['tmp_name'], $full_path)) {
      $logo_path = "uploads/platform/" . $filename;
      $logo_query = ", platform_logo = :logo";
    }
  }

  // 3. HANDLE LOGIN PHOTO
  $login_photo_path = null;
  $login_photo_query = "";
  if(isset($_FILES['login_photo']) && $_FILES['login_photo']['error'] === UPLOAD_ERR_OK) {
    // Delete old login photo if it exists
    if (!empty($currentSettings['login_photo'])) {
        $old_login_img = dirname(__DIR__, 3) . "/" . $currentSettings['login_photo'];
        if (file_exists($old_login_img)) unlink($old_login_img);
    }

    $file_ext = pathinfo($_FILES['login_photo']['name'], PATHINFO_EXTENSION);
    $filename = "login_" . uniqid() . "." . $file_ext;
    $full_path = $upload_dir . $filename;

    if (move_uploaded_file($_FILES['login_photo']['tmp_name'], $full_path)) {
      $login_photo_path = "uploads/platform/" . $filename;
      $login_photo_query = ", login_photo = :login_photo";
    }
  }

  // 4. UPDATE DATABASE
  $stmt = $pdo->prepare(
    "UPDATE platform_settings_tb 
    SET 
      platform_name = :name, 
      platform_email = :email, 
      contact_phone = :phone, 
      is_maintenance = :maintenance,
      maintenance_message = :maintenance_message
      $logo_query 
      $login_photo_query
    WHERE ps_id = 1"
  );

  $params = [
    ':name' => $name,
    ':email' => $email,
    ':phone' => $phone,
    ':maintenance' => $is_maintenance,
    ':maintenance_message' => $maintenance_message
  ];

  if($logo_path) $params[':logo'] = $logo_path;
  if($login_photo_path) $params[':login_photo'] = $login_photo_path;

  $stmt->execute($params);

  echo json_encode(["success" => true, "message" => "Platform settings updated successfully"]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}