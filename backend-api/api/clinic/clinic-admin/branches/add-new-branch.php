<?php
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';

$admin = validate_auth(['clinic_admin']); 
$userId = $admin->user_id ?? null;

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  if(!$userId) {
    throw new Exception("User ID are required");
  }

  // create clinic
  $stmtGetClinic = $pdo->prepare("SELECT clinic_id FROM clinics_tb WHERE created_by = :userId LIMIT 1");
  $stmtGetClinic->execute([':userId' => $userId]);
  $clinic = $stmtGetClinic->fetch(PDO::FETCH_ASSOC);

  if(!$clinic) {
    throw new Exception("No clinic found for this account.");
  }

  $clinicId = $clinic['clinic_id'];

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
      vet_license_number
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
      :vetLicenseNumber
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
    ':vetLicenseNumber' => $_POST['vetLicenseNumber']
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

    $baseDir = dirname(__DIR__, 4) . "/uploads/clinic/$branchId/$type/";
    if(!is_dir($baseDir)) {
      mkdir($baseDir, 0777, true);
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = $type . "_" . uniqid() . "." . $ext;
    $fullPath = $baseDir . $filename;

    move_uploaded_file($file['tmp_name'], $fullPath);

    return "uploads/clinic/$branchId/$type/$filename";
  }

  $tinPicPath = uploadPermit($_FILES['tinNumberPic'] ?? null, $branchId, 'tin_id');
  $businessPermitPath = uploadPermit($_FILES['businessPermitPic'] ?? null, $branchId, 'business_permit');
  $vetLicensePath = uploadPermit($_FILES['vetLicensePic'] ?? null, $branchId, 'vet_license');

  if(!$tinPicPath || !$businessPermitPath || !$vetLicensePath) {
    throw new Exception("Failed to upload required documents. Please check file sizes and formats.");
  }

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

  $pdo->commit();

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
