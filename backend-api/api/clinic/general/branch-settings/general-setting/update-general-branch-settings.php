<?php
require_once __DIR__ . '/../../../../../config/Database.php';
require_once __DIR__ . '/../../../../../middleware/auth-middleware.php';

$decodedToken = validate_auth(['clinic_admin']);
$adminId = $decodedToken->user_id;

$branchId = $_POST['branch_id'] ?? null;

if(!$branchId) {
  echo json_encode(["success" => false, "message" => "Branch ID is required."]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  $stmt = $pdo->prepare(
    "SELECT b.* FROM clinic_branches_tb b 
    JOIN clinics_tb c ON b.clinic_id = c.clinic_id 
    WHERE b.branch_id = ? AND c.created_by = ?"
  );
  $stmt->execute([$branchId, $adminId]);
  $branch = $stmt->fetch();

  if(!$branch) {
    echo json_encode(["success" => false, "message" => "Unauthorized or Branch not found."]);
    exit;
  }

  // full Path for to find the folder phy location
  $physicalBaseDir = dirname(__DIR__, 5) . "/uploads/clinic/" . $branchId . "/";  
  // what will send to db
  $dbBaseDir = "uploads/clinic/" . $branchId . "/";
  $fileMapping = [
    'logoPic' => ['col' => 'logo_picture', 'folder' => 'logo'],
    'tinNumberPic' => ['col' => 'tin_id_picture', 'folder' => 'tin_id'],
    'businessPermitPic' => ['col' => 'business_permit_picture', 'folder' => 'business_permit'],
    'vetLicensePic' => ['col' => 'vet_license_picture', 'folder' => 'vet_license']
  ];

  $imageUpdates = [];
  $imageParams = [];

  foreach($fileMapping as $formKey => $info) {
    if(isset($_FILES[$formKey]) && $_FILES[$formKey]['error'] === UPLOAD_ERR_OK) {
      
      // fix deletion 
      $oldDbPath = $branch[$info['col']];
      // use the physical root to find the file on the hard drive
      $oldPhysicalPath = dirname(__DIR__, 5) . "/" . $oldDbPath;
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
    province = ?, zip_code = ?, est = ?, website = ?, facebook = ?, 
    tin_id_number = ?, business_permit_number = ?, vet_license_number = ?,
    is_configured = 1";

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