<?php
// api/clinic/general/medical/download.php
header("Access-Control-Allow-Origin: *");

if (isset($_GET['path'])) {
    $relativePath = $_GET['path']; 
    
    // We go up 4 levels to get from /api/clinic/general/medical/ to the root
    // Adjust the number of ../ based on your actual root location
    $basePath = realpath(__DIR__ . '/../../../../');
    $fullPath = realpath($basePath . '/' . $relativePath); 
    
    // SECURITY: Ensure the file is actually inside the uploads directory
    // and that the file exists.
    if ($fullPath && file_exists($fullPath) && strpos($fullPath, $basePath) === 0) {
        header('Content-Description: File Transfer');
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . basename($fullPath) . '"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($fullPath));
        
        readfile($fullPath);
        exit;
    }
}

http_response_code(404);
echo "File not found.";