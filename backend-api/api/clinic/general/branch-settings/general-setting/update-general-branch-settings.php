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

    // 1. Fetch current data including clinic-wide branding info
    $stmt = $pdo->prepare(
        "SELECT b.*, 
                c.clinic_id,
                c.created_by as clinic_owner_id, 
                c.name as main_branding_name, 
                c.brand_logo 
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

    $tinNumber = $_POST['tinNumber'] ?? $branch['tin_id_number'];
    $permitNumber = $_POST['businessPermitNumber'] ?? $branch['business_permit_number'];
    $newBrandingName = $_POST['mainBrandingName'] ?? $branch['main_branding_name'];

    // --- CHANGE DETECTION ---
    $hasChanges = false;
    
    if (
        $branch['main_branding_name'] !== $newBrandingName ||
        $branch['name'] !== ($_POST['clinicName'] ?? $branch['name']) ||
        $branch['contact_number'] !== ($_POST['contactNumber'] ?? $branch['contact_number']) || 
        $branch['description'] !== ($_POST['clinicDescription'] ?? $branch['description']) ||
        $branch['address'] !== ($_POST['completeAddress'] ?? $branch['address']) ||
        $branch['municipality'] !== ($_POST['municipality'] ?? $branch['municipality']) ||
        $branch['province'] !== ($_POST['province'] ?? $branch['province']) ||
        $branch['zip_code'] !== ($_POST['zipCode'] ?? $branch['zip_code']) ||
        $branch['est'] !== ($_POST['est'] ?? $branch['est']) ||
        $branch['website'] !== ($_POST['website'] ?? $branch['website']) ||
        $branch['facebook'] !== ($_POST['facebook'] ?? $branch['facebook']) ||
        $branch['tin_id_number'] !== $tinNumber ||
        $branch['business_permit_number'] !== $permitNumber
    ) {
        $hasChanges = true;
    }

    // --- FILE MAPPING ---
    // Updated: brandLogo now points to its own 'clinic_brand_logo' folder
    $fileMapping = [
        'brandLogo'           => ['col' => 'brand_logo',              'folder' => 'clinic_brand_logo', 'table' => 'clinics_tb'],
        'logoPic'             => ['col' => 'logo_picture',            'folder' => 'logo',              'table' => 'clinic_branches_tb'],
        'tinNumberPic'        => ['col' => 'tin_id_picture',          'folder' => 'tin_id',          'table' => 'clinic_branches_tb'],
        'businessPermitPic'   => ['col' => 'business_permit_picture', 'folder' => 'business_permit', 'table' => 'clinic_branches_tb']
    ];

    foreach($fileMapping as $formKey => $info) {
        if(isset($_FILES[$formKey]) && $_FILES[$formKey]['error'] === UPLOAD_ERR_OK) {
            $hasChanges = true;
            break;
        }
    }

    if (!$hasChanges) {
        echo json_encode(["success" => true, "message" => "No changes were made.", "no_changes" => true]);
        exit;
    }

    // --- PROCESS UPLOADS ---
    $imageUpdates = ['clinic' => [], 'branch' => []];
    $imageParams = ['clinic' => [], 'branch' => []];

    foreach($fileMapping as $formKey => $info) {
        if(isset($_FILES[$formKey]) && $_FILES[$formKey]['error'] === UPLOAD_ERR_OK) {
            
            // Delete old file
            $oldDbPath = $branch[$info['col']];
            $oldPhysicalPath = dirname(__DIR__, 5) . "/" . $oldDbPath;
            if($oldDbPath && file_exists($oldPhysicalPath)) unlink($oldPhysicalPath);

            // Determine Directory: Brand logo goes to a global clinic folder, others to branch folder
            if ($info['table'] === 'clinics_tb') {
                $subPath = "uploads/clinic/branding/" . $branch['clinic_id'] . "/" . $info['folder'] . "/";
            } else {
                $subPath = "uploads/clinic/branches/" . $branchId . "/" . $info['folder'] . "/";
            }

            $targetDir = dirname(__DIR__, 5) . "/" . $subPath;
            if(!is_dir($targetDir)) mkdir($targetDir, 0777, true);

            $ext = pathinfo($_FILES[$formKey]['name'], PATHINFO_EXTENSION);
            $fileName = "img_" . uniqid() . "." . $ext;
            $dbPath = $subPath . $fileName;

            if(move_uploaded_file($_FILES[$formKey]['tmp_name'], $targetDir . $fileName)) {
                if ($info['table'] === 'clinics_tb') {
                    $imageUpdates['clinic'][] = "{$info['col']} = ?";
                    $imageParams['clinic'][] = $dbPath;
                } else {
                    $imageUpdates['branch'][] = "{$info['col']} = ?";
                    $imageParams['branch'][] = $dbPath; 
                }
            }
        }
    }

    // --- EXECUTE UPDATE: CLINICS TABLE ---
    if ($newBrandingName !== $branch['main_branding_name'] || !empty($imageUpdates['clinic'])) {
        $sqlC = "UPDATE clinics_tb SET name = ?";
        $paramsC = [$newBrandingName];

        if (!empty($imageUpdates['clinic'])) {
            $sqlC .= ", " . implode(", ", $imageUpdates['clinic']);
            $paramsC = array_merge($paramsC, $imageParams['clinic']);
        }

        $sqlC .= " WHERE clinic_id = ?";
        $paramsC[] = $branch['clinic_id'];
        $pdo->prepare($sqlC)->execute($paramsC);
    }

    // --- EXECUTE UPDATE: BRANCH TABLE ---
    $sqlB = "UPDATE clinic_branches_tb SET 
        name = ?, description = ?, address = ?, municipality = ?, 
        province = ?, zip_code = ?, est = ?, contact_number = ?, website = ?, facebook = ?, 
        tin_id_number = ?, business_permit_number = ?, is_configured = 1";

    $paramsB = [
        $_POST['clinicName'], $_POST['clinicDescription'], $_POST['completeAddress'], 
        $_POST['municipality'], $_POST['province'], $_POST['zipCode'], 
        $_POST['est'], $_POST['contactNumber'], $_POST['website'], $_POST['facebook'],
        $tinNumber, $permitNumber
    ];

    if(!empty($imageUpdates['branch'])) {
        $sqlB .= ", " . implode(", ", $imageUpdates['branch']);
        $paramsB = array_merge($paramsB, $imageParams['branch']);
    }

    $sqlB .= " WHERE branch_id = ?";
    $paramsB[] = $branchId;
    $pdo->prepare($sqlB)->execute($paramsB);

    // --- LOGS & NOTIFICATIONS ---
    log_audit($pdo, $userId, $branch['clinic_id'], $branchId, 'UPDATE', 'BRANCH_SETTINGS', $branchId);

    if ($userRole === 'branch_admin') {
        $adminName = ucwords(trim($decodedToken->fname . ' ' . $decodedToken->lname));
        send_notification($pdo, $branch['clinic_owner_id'], 'system', 
            "Branch Updated: " . ucwords($branch['name']), 
            "Admin {$adminName} updated the profile settings.");
    }

    $pdo->commit();
    echo json_encode(["success" => true, "message" => "Settings updated successfully!"]);

} catch(Exception $e) {
    if(isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>