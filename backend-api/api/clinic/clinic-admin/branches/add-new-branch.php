<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';
require_once __DIR__ . '/../../../../helper/send_notification.php'; 

$admin = validate_auth(['clinic_admin']); 
$userId = $admin->user_id ?? null;

try {
  $pdo = (new Database())->pdo;
  $pdo->beginTransaction();

  if(!$userId) {
      throw new Exception("User ID is required");
  }

  // 1. Get Clinic Info AND Admin Name for the notification
  $stmtGetInfo = $pdo->prepare("
      SELECT c.clinic_id, c.name as clinic_name, u.first_name, u.last_name 
      FROM clinics_tb c
      JOIN user_tb u ON c.created_by = u.user_id
      WHERE c.created_by = :userId LIMIT 1
  ");
  $stmtGetInfo->execute([':userId' => $userId]);
  $clinicData = $stmtGetInfo->fetch(PDO::FETCH_ASSOC);

  if(!$clinicData) {
      throw new Exception("No clinic found for this account.");
  }

  $clinicId = $clinicData['clinic_id'];
  $parentClinicName = ucwords(strtolower($clinicData['clinic_name']));
  $adminFullName = ucwords(strtolower($clinicData['first_name'] . " " . $clinicData['last_name']));

  // 2. Insert the new clinic branch
  $stmtBranch = $pdo->prepare(
      "INSERT INTO clinic_branches_tb (
          clinic_id, name, description, address, municipality, 
          province, zip_code, est, contact_number, website, 
          facebook, tin_id_number, business_permit_number
      ) VALUES (
          :clinicId, :name, :description, :address, :municipality, 
          :province, :zipCode, :est, :contactNumber, :website, 
          :facebook, :tinNumber, :businessPermitNumber
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

  // 3. Assign Services
  $services = $_POST['services'] ?? '[]';
  $servicesArray = json_decode($services, true);

  if(!empty($servicesArray)) {
      $stmtService = $pdo->prepare(
          "INSERT INTO branch_service_tb (
              branch_id, service_id, assigned_role, custom_name, 
              custom_description, price, duration
          ) 
          SELECT :branch_id, service_id, 'veterinarian', name, description, price, duration 
          FROM service_tb 
          WHERE service_id = :service_id"
      );

      foreach($servicesArray as $id) {
          $stmtService->execute([':branch_id' => $branchId, ':service_id' => $id]);
      }
  }

  // 4. Handle Document Uploads
  function uploadPermit($file, $branchId, $type) {
      if(!isset($file) || $file['error'] !== 0) return null;

      $baseDir = dirname(__DIR__, 4) . "/uploads/clinic/$branchId/$type/";
      if(!is_dir($baseDir)) mkdir($baseDir, 0777, true);

      $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
      $filename = $type . "_" . uniqid() . "." . $ext;
      $fullPath = $baseDir . $filename;

      move_uploaded_file($file['tmp_name'], $fullPath);
      return "uploads/clinic/$branchId/$type/$filename";
  }

  $tinPicPath = uploadPermit($_FILES['tinNumberPic'] ?? null, $branchId, 'tin_id');
  $businessPermitPath = uploadPermit($_FILES['businessPermitPic'] ?? null, $branchId, 'business_permit');

  if(!$tinPicPath || !$businessPermitPath) {
      throw new Exception("Required documents missing or upload failed.");
  }

  // 5. Update branch with file paths
  $stmtUpdate = $pdo->prepare("UPDATE clinic_branches_tb SET tin_id_picture = ?, business_permit_picture = ? WHERE branch_id = ?");
  $stmtUpdate->execute([$tinPicPath, $businessPermitPath, $branchId]);

  // 6. Audit Logging
  log_audit($pdo, $userId, $clinicId, $branchId, 'CREATE', 'BRANCH', $branchId);

  $pdo->commit();

  // 7. NOTIFY ALL SUPER ADMINS
  // 7. NOTIFY ALL SUPER ADMINS
  try {
      // This is the name of the NEW branch being added
      $newBranchName = ucwords(strtolower($_POST['clinicName']));
      
      $stmtSAs = $pdo->prepare("SELECT user_id FROM user_tb WHERE role_id = 1");
      $stmtSAs->execute();
      $superAdminIds = $stmtSAs->fetchAll(PDO::FETCH_COLUMN);

      // Title shows the new branch
      $notifTitle = "Branch Review: $newBranchName";

      // Message uses the Admin Name ($adminFullName) and Parent Clinic ($parentClinicName) we got in Step 1
      $notifMessage = "(#$userId) $adminFullName from clinic ID#$clinicId has added a new branch: $newBranchName. It is now ready for your review and approval.";
      
      $notifCategory = "clinic_application_request";

      foreach ($superAdminIds as $saId) {
        send_notification($pdo, $saId, $notifCategory, $notifTitle, $notifMessage);
      }
  } catch (Exception $e) {
      error_log("Notification Error: " . $e->getMessage());
  }

  echo json_encode([
      "success" => true,
      "message" => "Branch added successfully. Please wait for admin approval."
  ]);

} catch(Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(400);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}