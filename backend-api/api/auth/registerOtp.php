<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../service/Otp.php';

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
      website,
      facebook,
      tin_id_number,
      business_permit_number,
      vet_license_number,
      operating_hours_start_time,
      operating_hours_end_time
    ) VALUES (
      :clinicId,
      :name,
      :description,
      :address,
      :municipality,
      :province,
      :zipCode,
      :est,
      :website,
      :facebook,
      :tinNumber,
      :businessPermitNumber,
      :vetLicenseNumber,
      :clinicStartTime,
      :clinicEndTime
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
    ':website' => $_POST['website'] ?: null,
    ':facebook' => $_POST['facebook'] ?: null,
    ':tinNumber' => $_POST['tinNumber'],
    ':businessPermitNumber' => $_POST['businessPermitNumber'],
    ':vetLicenseNumber' => $_POST['vetLicenseNumber'],
    ':clinicStartTime' => $_POST['clinicStartTime'] ?: null,
    ':clinicEndTime' => $_POST['clinicEndTime'] ?: null
]);

  $branchId = $pdo->lastInsertId();


  // file upload
  function uploadPermit($file, $branchId, $type) {
    if(!isset($file) || $file['error'] !== 0) {
      return null;
    }

    $baseDir = __DIR__ . "/../uploads/clinic/$branchId/$type/";
    if(!is_dir($baseDir)) {
      mkdir($baseDir, 0777, true);
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = $type . "_" . uniqid() . "." . $ext;
    $fullPath = $baseDir . $filename;

    move_uploaded_file($file['tmp_name'], $fullPath);

    return "uploads/clinic/$branchId/$type/$filename";
  }

  $tinPicPath = uploadPermit($_FILES['tinNumberPic'], $branchId, 'tin_id');
  $businessPermitPath = uploadPermit($_FILES['businessPermitPic'], $branchId, 'business_permit');
  $vetLicensePath = uploadPermit($_FILES['vetLicensePic'], $branchId, 'vet_license');


  // update clinic branch permit picture
  $stmtUpdate = $pdo->prepare(
    "UPDATE clinic_branches_tb
    SET
      tin_id_picture = ?,
      business_permit_picture = ?,
      vet_license_picture = ?
    WHERE branch_id = ?"
  );

  $stmtUpdate->execute([
    $tinPicPath,
    $businessPermitPath,
    $vetLicensePath,
    $branchId
  ]);

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
