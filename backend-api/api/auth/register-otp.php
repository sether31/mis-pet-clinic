<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../service/Otp.php';
require_once __DIR__ . '/../../helper/log_audit.php';

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  $tempUserId = $_POST['temp_user_id'] ?? null;
  $otp = $_POST['otp'] ?? null;

  if(!$tempUserId || !$otp) {
    throw new Exception("User ID and OTP are required");
  }

  // check otp
  if(!verifyOtp($tempUserId, $otp, 'register')) {
    throw new Exception("Invalid or expired OTP");
  }

  // create user
  $stmtUser = $pdo->prepare(
    "INSERT INTO user_tb 
    (email, password, first_name, last_name, role_id)
    VALUES 
    (:email, :password, :fname ,:lname, :role_id)"
  );

  $stmtUser->execute([
    ':email' => $_POST['email'],
    ':password' => password_hash($_POST['password'], PASSWORD_DEFAULT),
    ':fname' => $_POST['firstName'],
    ':lname' => $_POST['lastName'],
    ':role_id' => 2
  ]);

  $userId = $pdo->lastInsertId();

  // create clinic
  $stmtClinic = $pdo->prepare(
    "INSERT INTO clinics_tb (name, created_by)
    VALUES (:name, :created_by)"
  );

  $stmtClinic->execute([
    ':name' =>$_POST['clinicName'],
    ':created_by' => $userId
  ]);

  $clinicId = $pdo->lastInsertId();

  // create clinic branch
  $stmtBranch = $pdo->prepare(
    "INSERT INTO clinic_branches_tb (
      clinic_id,
      name,
      description,
      address,
      municipality,
      province,
      zip_code,
      est,
      contact_number,
      website,
      facebook,
      tin_id_number,
      business_permit_number
    ) VALUES (
      :clinicId,
      :name,
      :description,
      :address,
      :municipality,
      :province,
      :zipCode,
      :est,
      :contactNumber,
      :website,
      :facebook,
      :tinNumber,
      :businessPermitNumber
    )"
  );

  $stmtBranch->execute([
    ':clinicId' => $clinicId,
    ':name' => $_POST['clinicName'],
    ':description' => $_POST['clinicDescription'] ?: null,
    ':address' => $_POST['completeAddress'],
    ':municipality' => $_POST['municipality'],
    ':province' => $_POST['province'],
    ':zipCode' => $_POST['zipCode'],
    ':est' => $_POST['est'] ?: null,
    ':contactNumber' => $_POST['contactNumber'] ?? null,
    ':website' => $_POST['website'] ?: null,
    ':facebook' => $_POST['facebook'] ?: null,
    ':tinNumber' => $_POST['tinNumber'],
    ':businessPermitNumber' => $_POST['businessPermitNumber']
  ]);

  $branchId = $pdo->lastInsertId();

  // services
  $services = $_POST['services'] ?? '[]';
  $servicesArray = json_decode($services, true);

  if(!empty($servicesArray)) {
    $stmtService = $pdo->prepare(
      "INSERT INTO branch_service_tb (
        branch_id, 
        service_id, 
        assigned_role,
        custom_name, 
        custom_description, 
        price, 
        duration
      ) 
      SELECT 
        :branch_id, 
        service_id, 
        'veterinarian', 
        name,        
        description,    
        price,       
        duration   
      FROM service_tb 
      WHERE service_id = :service_id"
    );

    foreach($servicesArray as $id) {
      $stmtService->execute([
        ':branch_id' => $branchId, 
        ':service_id' => $id
      ]);
    }
  }


  // file upload
  function uploadPermit($file, $branchId, $type) {
    if(!isset($file) || $file['error'] !== 0) {
      return null;
    }

    $baseDir = dirname(__DIR__, 2) . "/uploads/clinic/$branchId/$type/";
    if(!is_dir($baseDir)) {
      mkdir($baseDir, 0755, true);
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = $type . "_" . uniqid() . "." . $ext;
    $fullPath = $baseDir . $filename;

    move_uploaded_file($file['tmp_name'], $fullPath);

    return "uploads/clinic/$branchId/$type/$filename";
  }

  $tinPicPath = uploadPermit($_FILES['tinNumberPic'] ?? null, $branchId, 'tin_id');
  $businessPermitPath = uploadPermit($_FILES['businessPermitPic'] ?? null, $branchId, 'business_permit');

  if(!$tinPicPath || !$businessPermitPath) {
    throw new Exception("Failed to upload required documents. Please check file sizes and formats.");
  }

  // update clinic branch permit picture
  $stmtUpdate = $pdo->prepare(
    "UPDATE clinic_branches_tb
    SET
      tin_id_picture = ?,
      business_permit_picture = ?
    WHERE branch_id = ?"
  );

  $stmtUpdate->execute([
    $tinPicPath,
    $businessPermitPath,
    $branchId
  ]);

  // log create user
  log_audit($pdo, $userId, $clinicId, $branchId, 'CREATE', 'USER', $userId);

  // log create clinic
  log_audit($pdo, $userId, $clinicId, $branchId, 'CREATE', 'CLINIC', $clinicId);

  // log create branch
  log_audit($pdo, $userId, $clinicId, $branchId, 'CREATE', 'BRANCH', $branchId);

  $pdo->commit();

  // delete temp id in otp
  cleanupOtp($tempUserId, 'register');

  echo json_encode([
    "success" => true,
    "message" => "Registration completed. Please wait for admin approval."
  ]);

} catch(Exception $e) {
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ]);
}
