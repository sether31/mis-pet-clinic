<?php
require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../middleware/auth_middleware.php';

$decodedToken = validate_auth(['clinic_admin']);
$adminUserId = $decodedToken->user_id;

$pdo = (new Database())->pdo;
// find the clinic admin
$stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinics_tb WHERE created_by = ?");
$stmtClinic->execute([$adminUserId]);
$clinic = $stmtClinic->fetch();

if(!$clinic) {
  echo json_encode(["success" => false, "message" => "Clinic owner record not found."]);
  exit;
}

$clinicId = $clinic['clinic_id']; 
// find the branch
$stmtBranch = $pdo->prepare("SELECT * FROM clinic_branches_tb WHERE clinic_id = ?");
$stmtBranch->execute([$clinicId]);
$branch = $stmtBranch->fetch();

if(!$branch) {
  echo json_encode(["success" => false, "message" => "Clinic branch not found."]);
  exit;
}

$branchId = $branch['branch_id']; 

try {
  $pdo->beginTransaction();

  // remove image clean smth
  $baseDir = "../uploads/clinic/" . $branchId . "/";
  $fileMapping = [
    'tinNumberPic' => ['col' => 'tin_id_picture', 'folder' => 'tin_id'],
    'businessPermitPic' => ['col' => 'business_permit_picture', 'folder' => 'business_permit'],
    'vetLicensePic' => ['col' => 'vet_license_picture', 'folder' => 'vet_license']
  ];

  $imageUpdates = [];
  $imageParams = [];

  foreach($fileMapping as $formKey => $info) {
    if(isset($_FILES[$formKey]) && $_FILES[$formKey]['error'] === UPLOAD_ERR_OK) {
      // delete old image
      $oldPath = $branch[$info['col']];
      if($oldPath && file_exists($oldPath)) {
        unlink($oldPath);
      }

      $targetDir = $baseDir . $info['folder'] . "/";
      if(!is_dir($targetDir)) mkdir($targetDir, 0777, true);

      $ext = pathinfo($_FILES[$formKey]['name'], PATHINFO_EXTENSION);
      $targetPath = $targetDir . "img_" . uniqid() . "." . $ext;

      if(move_uploaded_file($_FILES[$formKey]['tmp_name'], $targetPath)) {
        $imageUpdates[] = "{$info['col']} = ?";
        $imageParams[] = $targetPath;
      }
    }
  }

  // 5. Update the Branch Table
  $sql = "UPDATE clinic_branches_tb SET 
    name = ?, description = ?, address = ?, municipality = ?, 
    province = ?, zip_code = ?, est = ?, website = ?, facebook = ?, 
    tin_id_number = ?, business_permit_number = ?, vet_license_number = ?, 
    operating_hours_start_time = ?, operating_hours_end_time = ?, 
    status = 'pending', feedback = NULL";

  $mainParams = [
    $_POST['clinicName'], 
    $_POST['clinicDescription'], 
    $_POST['completeAddress'],
    $_POST['municipality'], 
    $_POST['province'], 
    $_POST['zipCode'],
    $_POST['est'], 
    $_POST['website'], 
    $_POST['facebook'],
    $_POST['tinNumber'], 
    $_POST['businessPermitNumber'], 
    $_POST['vetLicenseNumber'],
    $_POST['clinicStartTime'], 
    $_POST['clinicEndTime']
  ];

  if(!empty($imageUpdates)) {
    $sql .= ", " . implode(", ", $imageUpdates);
  }

  $sql .= " WHERE branch_id = ?";
  $finalParams = array_merge($mainParams, $imageParams, [$branchId]);

  $pdo->prepare($sql)->execute($finalParams);

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Update Successfully"]);

} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}