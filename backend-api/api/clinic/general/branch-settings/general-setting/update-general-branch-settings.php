<?php
require_once __DIR__ . '/../../../../../config/Database.php';
require_once __DIR__ . '/../../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../../helper/log_audit.php';
require_once __DIR__ . '/../../../../../helper/send_notification.php';

// Allow both admins to trigger this
$decodedToken = validate_auth(['clinic_admin', 'branch_admin']);
$userId = $decodedToken->user_id;
$userRole = $decodedToken->role;

$branchId = $_POST['branch_id'] ?? null;

if(!$branchId) {
  echo json_encode(["success" => false, "message" => "Branch ID is required."]);
  exit;
}

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  // Get branch data AND the clinic owner's ID for the notification
  $stmt = $pdo->prepare(
    "SELECT b.*, c.created_by as clinic_owner_id, c.name as main_branding_name 
    FROM clinic_branches_tb b 
    JOIN clinics_tb c ON b.clinic_id = c.clinic_id 
    WHERE b.branch_id = ?"
  );
  $stmt->execute([$branchId]);
  $branch = $stmt->fetch();

  if(!$branch) {
    echo json_encode(["success" => false, "message" => "Unauthorized or Branch not found."]);
    exit;
  }

  // 👇 SAFE FALLBACKS (Prevents Branch Admin from wiping hidden licensing fields) 👇
  $tinNumber = $_POST['tinNumber'] ?? $branch['tin_id_number'];
  $permitNumber = $_POST['businessPermitNumber'] ?? $branch['business_permit_number'];
  $newBrandingName = $_POST['mainBrandingName'] ?? $branch['main_branding_name'];

  // 👇 CHANGE DETECTOR 👇
  $hasChanges = false;
  
  if (
      $branch['main_branding_name'] !== $newBrandingName ||
      $branch['name'] !== $_POST['clinicName'] ||
      $branch['contact_number'] !== $_POST['contactNumber'] || 
      $branch['description'] !== $_POST['clinicDescription'] ||
      $branch['address'] !== $_POST['completeAddress'] ||
      $branch['municipality'] !== $_POST['municipality'] ||
      $branch['province'] !== $_POST['province'] ||
      $branch['zip_code'] !== $_POST['zipCode'] ||
      $branch['est'] !== $_POST['est'] ||
      $branch['website'] !== $_POST['website'] ||
      $branch['facebook'] !== $_POST['facebook'] ||
      $branch['tin_id_number'] !== $tinNumber ||
      $branch['business_permit_number'] !== $permitNumber
  ) {
    $hasChanges = true;
  }

  if ($newBrandingName !== $branch['main_branding_name']) {
      $stmtBrand = $pdo->prepare("UPDATE clinics_tb SET name = ? WHERE clinic_id = ?");
      $stmtBrand->execute([$newBrandingName, $branch['clinic_id']]);
  }

  $fileMapping = [
    'logoPic' => ['col' => 'logo_picture', 'folder' => 'logo'],
    'tinNumberPic' => ['col' => 'tin_id_picture', 'folder' => 'tin_id'],
    'businessPermitPic' => ['col' => 'business_permit_picture', 'folder' => 'business_permit']
  ];

  foreach($fileMapping as $formKey => $info) {
      if(isset($_FILES[$formKey]) && $_FILES[$formKey]['error'] === UPLOAD_ERR_OK) {
          $hasChanges = true;
          break;
      }
  }

  // If no changes, skip DB completely
  if (!$hasChanges) {
      echo json_encode(["success" => true, "message" => "No changes were made.", "no_changes" => true]);
      exit;
  }

  // --- PROCESS UPLOADS ---
  $physicalBaseDir = dirname(__DIR__, 5) . "/uploads/clinic/" . $branchId . "/";  
  $dbBaseDir = "uploads/clinic/" . $branchId . "/";

  $imageUpdates = [];
  $imageParams = [];

  foreach($fileMapping as $formKey => $info) {
    if(isset($_FILES[$formKey]) && $_FILES[$formKey]['error'] === UPLOAD_ERR_OK) {
      
      $oldDbPath = $branch[$info['col']];
      $oldPhysicalPath = dirname(__DIR__, 5) . "/" . $oldDbPath;
      if($oldDbPath && file_exists($oldPhysicalPath)) {
        unlink($oldPhysicalPath);
      }

      $targetDir = $physicalBaseDir . $info['folder'] . "/";
      if(!is_dir($targetDir)) mkdir($targetDir, 0777, true);

      $ext = pathinfo($_FILES[$formKey]['name'], PATHINFO_EXTENSION);
      $fileName = "img_" . uniqid() . "." . $ext;

      $targetPhysicalPath = $targetDir . $fileName; 
      $targetDbPath = $dbBaseDir . $info['folder'] . "/" . $fileName; 

      if(move_uploaded_file($_FILES[$formKey]['tmp_name'], $targetPhysicalPath)) {
        $imageUpdates[] = "{$info['col']} = ?";
        $imageParams[] = $targetDbPath; 
      }
    }
  }

  // --- UPDATE DATABASE ---
  $sql = "UPDATE clinic_branches_tb SET 
    name = ?, description = ?, address = ?, municipality = ?, 
    province = ?, zip_code = ?, est = ?, contact_number = ?, website = ?, facebook = ?, 
    tin_id_number = ?, business_permit_number = ?,
    is_configured = 1";

  $mainParams = [
    $_POST['clinicName'], $_POST['clinicDescription'], $_POST['completeAddress'], 
    $_POST['municipality'], $_POST['province'], $_POST['zipCode'], 
    $_POST['est'], $_POST['contactNumber'], $_POST['website'], $_POST['facebook'],
    $tinNumber, $permitNumber
  ];

  if(!empty($imageUpdates)) {
    $sql .= ", " . implode(", ", $imageUpdates);
  }

  $sql .= " WHERE branch_id = ?";
  $finalParams = array_merge($mainParams, $imageParams, [$branchId]);

  $pdo->prepare($sql)->execute($finalParams);

  // --- AUDIT LOG ---
  log_audit(
    $pdo, 
    $userId, 
    $branch['clinic_id'], 
    $branchId, 
    'UPDATE', 
    'BRANCH_GENERAL_SETTINGS', 
    $branchId
  );

  // --- NOTIFICATION FOR OWNER ---
  if ($userRole === 'branch_admin') {
    $adminName = ucwords(trim($decodedToken->fname . ' ' . $decodedToken->lname));
    $branchName = ucwords($branch['name']);
    
    $title = "Branch Profile Updated: " . $branchName;
    $message = "Branch Admin ({$adminName}) updated the clinic information for {$branchName}.";
    
    send_notification($pdo, $branch['clinic_owner_id'], 'system', $title, $message);
  }

  $pdo->commit();
  echo json_encode(["success" => true, "message" => "Settings updated successfully!"]);

} catch(Exception $e) {
  if(isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>