<?php
require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../helper/log_audit.php';

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

  // full Path for to find the folder phy location
  $physicalBaseDir = dirname(__DIR__, 2) . "/uploads/clinic/" . $branchId . "/";  
  // what will send to db
  $dbBaseDir = "uploads/clinic/" . $branchId . "/";
  $fileMapping = [
    'tinNumberPic' => ['col' => 'tin_id_picture', 'folder' => 'tin_id'],
    'businessPermitPic' => ['col' => 'business_permit_picture', 'folder' => 'business_permit']
  ];

  $imageUpdates = [];
  $imageParams = [];

  foreach($fileMapping as $formKey => $info) {
    if(isset($_FILES[$formKey]) && $_FILES[$formKey]['error'] === UPLOAD_ERR_OK) {
      
      // fix deletion 
      $oldDbPath = $branch[$info['col']];
      // use the physical root to find the file on the hard drive
      $oldPhysicalPath = dirname(__DIR__, 2) . "/" . $oldDbPath;
      if($oldDbPath && file_exists($oldPhysicalPath)) {
        unlink($oldPhysicalPath);
      }

      // prepare dir
      $targetDir = $physicalBaseDir . $info['folder'] . "/";
      if(!is_dir($targetDir)) mkdir($targetDir, 0777, true);

      // generate filename 
      $ext = pathinfo($_FILES[$formKey]['name'], PATHINFO_EXTENSION);
      $fileName = "img_" . uniqid() . "." . $ext;

      // php
      $targetPhysicalPath = $targetDir . $fileName; 
      // react
      $targetDbPath = $dbBaseDir . $info['folder'] . "/" . $fileName; 

      // save
      if(move_uploaded_file($_FILES[$formKey]['tmp_name'], $targetPhysicalPath)) {
        $imageUpdates[] = "{$info['col']} = ?";
        $imageParams[] = $targetDbPath; 
      }
    }
  }

  // update branch table
  $sql = "UPDATE clinic_branches_tb SET 
    name = ?, description = ?, address = ?, municipality = ?, 
    province = ?, zip_code = ?, est = ?, contact_number = ?, website = ?, facebook = ?, 
    tin_id_number = ?, business_permit_number = ?, 
    status = 'pending', feedback = NULL";

  $mainParams = [
    $_POST['clinicName'], 
    $_POST['clinicDescription'], 
    $_POST['completeAddress'],
    $_POST['municipality'], 
    $_POST['province'], 
    $_POST['zipCode'],
    $_POST['est'], 
    $_POST['contactNumber'] ?? null,
    $_POST['website'], 
    $_POST['facebook'],
    $_POST['tinNumber'], 
    $_POST['businessPermitNumber']
  ];

  if(!empty($imageUpdates)) {
    $sql .= ", " . implode(", ", $imageUpdates);
  }

  $sql .= " WHERE branch_id = ?";
  $finalParams = array_merge($mainParams, $imageParams, [$branchId]);

  $pdo->prepare($sql)->execute($finalParams);

  // audit update pending branch 
  log_audit(
    $pdo, 
    $adminUserId, 
    $clinicId, 
    $branchId, 
    'UPDATE', 
    'BRANCH_PENDING_RESUBMIT', 
    $branchId
  );

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Update Successfully"]);

} catch(Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}