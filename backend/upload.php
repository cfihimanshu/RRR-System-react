<?php
// RRR System - Direct Image Upload Script for cPanel
// Placed in: public_html/uploads/upload.php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['file'];
        
        // Generate a safe, unique file name
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $safeName = preg_replace("/[^a-zA-Z0-9]/", "_", pathinfo($file['name'], PATHINFO_FILENAME));
        $fileName = time() . '_' . $safeName . '.' . $extension;
        
        // Target path in the current directory (public_html/uploads)
        $targetPath = __DIR__ . '/' . $fileName;

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            // Generate public URL dynamically based on the current domain
            $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
            $domain = $_SERVER['HTTP_HOST'];
            
            // Build the URL (e.g. https://cfi247.com/uploads/1234_img.jpg)
            // Assuming this script is inside /uploads folder
            $folderPath = dirname($_SERVER['PHP_SELF']); 
            if ($folderPath == '/' || $folderPath == '\\') $folderPath = '';
            
            $fileUrl = $protocol . "://" . $domain . $folderPath . "/" . $fileName;

            echo json_encode(['success' => true, 'url' => $fileUrl]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to move uploaded file. Check folder permissions (should be 0755).']);
        }
    } else {
        http_response_code(400);
        $error = isset($_FILES['file']['error']) ? 'Upload error code: ' . $_FILES['file']['error'] : 'No file received';
        echo json_encode(['success' => false, 'error' => $error]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Invalid request method. Only POST is allowed.']);
}
?>
