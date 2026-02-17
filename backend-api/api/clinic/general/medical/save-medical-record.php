<?php
require_once __DIR__ . '/../../../../middleware/auth-middleware.php';
require_once __DIR__ . '/../../../../config/Database.php';
require_once __DIR__ . '/../../../../helper/log_audit.php';

$user = validate_auth(['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);

$pdo = (new Database)->pdo;

function handleUpload($file, $subfolder, $allowedTypes) {
  if(!isset($file) || $file['error'] !== UPLOAD_ERR_OK) return null;

  $baseDir = __DIR__ . '/../../../../uploads/medical/';
  $targetDir = $baseDir . $subfolder . '/';
  
  if(!file_exists($targetDir)) {
    mkdir($targetDir, 0777, true);
  }

  $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
  if(!in_array($ext, $allowedTypes)) return null;

  $fileName = uniqid('med_') . '_' . time() . '.' . $ext;
  $targetPath = $targetDir . $fileName;

  if(move_uploaded_file($file['tmp_name'], $targetPath)) {
    return "uploads/medical/" . $subfolder . "/" . $fileName;
  }
  return null;
}

try {
  $appointment_id = $_POST['appointment_id'] ?? null;
  $pet_id = $_POST['pet_id'] ?? null;
  $branch_id = $_POST['branch_id'] ?? null;
  $record_type = $_POST['record_type'] ?? 'medical'; 
  $diagnosis = $_POST['diagnosis'] ?? '';
  $treatment = $_POST['treatment'] ?? '';
  $status = $_POST['status'] ?? 'Recorded';
  $current_user_id = $user->user_id;

  if(!$appointment_id) {
    throw new Exception("Appointment ID is required.");
  }

  $pdo->beginTransaction();

  // get clinic for audit
  $stmtClinic = $pdo->prepare("SELECT clinic_id FROM clinic_branches_tb WHERE branch_id = ?");
  $stmtClinic->execute([$branch_id]);
  $clinicId = $stmtClinic->fetchColumn() ?: 0;

  // process uploads
  $img1 = handleUpload($_FILES['image_1'] ?? null, 'photos', ['jpg', 'jpeg', 'png']);
  $img2 = handleUpload($_FILES['image_2'] ?? null, 'photos', ['jpg', 'jpeg', 'png']);
  $doc1 = handleUpload($_FILES['doc_1'] ?? null, 'documents', ['pdf']);
  $doc2 = handleUpload($_FILES['doc_2'] ?? null, 'documents', ['pdf']);

  // check for existing record
  $checkStmt = $pdo->prepare("SELECT * FROM medrecord_tb WHERE appointment_id = ?");
  $checkStmt->execute([$appointment_id]);
  $existing = $checkStmt->fetch();

  if($existing) {
    $recordId = $existing['medical_id'];

    // update
    $updateFields = [
      "record_type = :record_type",
      "diagnosis = :diagnosis",
      "treatment = :treatment",
      "status = :status",
      "updated_by = :updated_by"
    ];

    // if Non-Medical force diagnosis/treatment to null
    $params = [
      ':record_type' => $record_type,
      ':diagnosis' => ($record_type === 'non_medical') ? null : $diagnosis,
      ':treatment' => ($record_type === 'non_medical') ? null : $treatment,
      ':status' => $status,
      ':updated_by' => $current_user_id,
      ':app_id' => $appointment_id
    ];

    if($record_type === 'non_medical') {
      // wipe all medical data
      $fileColumns = ['med_image_1', 'med_image_2', 'med_doc_1', 'med_doc_2'];
      foreach ($fileColumns as $col) {
        // delete physical file
        if (!empty($existing[$col])) {
          $oldPath = __DIR__ . '/../../../../' . $existing[$col];
          if (file_exists($oldPath)) @unlink($oldPath);
        }
          // set column to NULL in SQL
        $updateFields[] = "$col = NULL";
      }
    } else {
      // file update 
      $fileMap = [
        'med_image_1' => $img1, 
        'med_image_2' => $img2, 
        'med_doc_1' => $doc1, 
        'med_doc_2' => $doc2
      ];

      foreach($fileMap as $column => $newValue) {
        if($newValue) {
          $updateFields[] = "$column = :$column";
          $params[":$column"] = $newValue;
          // delete old file if a new one is being uploaded
          if(!empty($existing[$column])) {
            @unlink(__DIR__ . '/../../../../' . $existing[$column]);
          }
        }
      }
    }

    $sql = "UPDATE medrecord_tb SET " . implode(', ', $updateFields) . " WHERE appointment_id = :app_id";
    $pdo->prepare($sql)->execute($params);

    // audit update med record
    log_audit($pdo, $user->user_id, $clinicId, $branch_id, 'UPDATE', 'MEDICAL_RECORD_DETAILS', $recordId);
    $message = "Record updated successfully.";
  } else {   

    $pdo->prepare(
      "INSERT INTO medrecord_tb 
      (appointment_id, pet_id, branch_id, record_type, diagnosis, treatment, status, med_image_1, med_image_2, med_doc_1, med_doc_2) 
      VALUES (:app_id, :pet_id, :branch_id, :record_type, :diagnosis, :treatment, :status, :updated_by, :img1, :img2, :doc1, :doc2)"
    )->execute([
      ':app_id' => $appointment_id,
      ':pet_id' => $pet_id,
      ':branch_id' => $branch_id,
      ':record_type' => $record_type,
      ':diagnosis' => ($record_type === 'non_medical') ? '' : $diagnosis,
      ':treatment' => ($record_type === 'non_medical') ? '' : $treatment,
      ':status' => $status,
      ':updated_by' => $current_user_id,
      ':img1' => $img1,
      ':img2' => $img2,
      ':doc1' => $doc1,
      ':doc2' => $doc2
    ]);
    $recordId = $pdo->lastInsertId();

    // audit create medical record details
    log_audit($pdo, $user->user_id, $clinicId, $branch_id, 'CREATE', 'MEDICAL_RECORD_DETAILS', $recordId);
    $message = "Record saved successfully.";
  }

  $pdo->commit();
  echo json_encode(["success" => true, "message" => $message]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}