<?php
// =========================================================
// Handles uploads for officers, services, posts, photo albums,
// e-news issues and materials. Saves files to /uploads/{folder}/
// and returns a relative path to store in MySQL (never store
// binary data in the DB).
// =========================================================

const IMAGE_TYPES = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];

// Office formats are zip containers, so finfo may report either their
// specific type or plain application/zip depending on the server.
const DOCUMENT_TYPES = [
    'pdf'  => ['application/pdf'],
    'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
    'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip'],
    'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
];

// Validates one entry of $_FILES and moves it into uploads/{folder}/.
// $allowed maps extension => list of acceptable MIME types.
function storeUpload(array $file, $folder, array $allowed, $maxBytes, $label) {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        respond(false, ['message' => "$label upload failed."], 400);
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!array_key_exists($ext, $allowed)) {
        $list = strtoupper(implode(', ', array_keys($allowed)));
        respond(false, ['message' => "Invalid file type. Only $list allowed."], 400);
    }

    if ($file['size'] > $maxBytes) {
        respond(false, ['message' => "$label too large. Max " . round($maxBytes / 1048576) . 'MB.'], 400);
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if (!in_array($mime, (array) $allowed[$ext], true)) {
        respond(false, ['message' => 'File content does not match its extension.'], 400);
    }

    $uploadDir = __DIR__ . '/../uploads/' . $folder . '/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $filename = bin2hex(random_bytes(8)) . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
        respond(false, ['message' => 'Could not save uploaded file.'], 500);
    }

    // relative path stored in DB, served via /backend/uploads/...
    return 'uploads/' . $folder . '/' . $filename;
}

function handleImageUpload($fileField, $folder, $maxBytes = 5 * 1024 * 1024) {
    if (empty($_FILES[$fileField]) || $_FILES[$fileField]['error'] === UPLOAD_ERR_NO_FILE) {
        return null; // no file uploaded, that's fine (optional field)
    }
    return storeUpload($_FILES[$fileField], $folder, IMAGE_TYPES, $maxBytes, 'Image');
}

// For <input type="file" name="photos[]" multiple>. Returns a list of paths.
function handleMultipleImageUploads($fileField, $folder, $maxBytes = 10 * 1024 * 1024) {
    if (empty($_FILES[$fileField]) || !is_array($_FILES[$fileField]['name'])) {
        return [];
    }
    $files = $_FILES[$fileField];
    $paths = [];
    foreach ($files['name'] as $i => $name) {
        if ($files['error'][$i] === UPLOAD_ERR_NO_FILE) continue;
        $paths[] = storeUpload([
            'name' => $name,
            'tmp_name' => $files['tmp_name'][$i],
            'error' => $files['error'][$i],
            'size' => $files['size'][$i],
        ], $folder, IMAGE_TYPES, $maxBytes, 'Photo');
    }
    return $paths;
}

// PDFs and Office documents. Returns ['path' => ..., 'size' => bytes] or null.
function handleDocumentUpload($fileField, $folder, $allowedExts = ['pdf'], $maxBytes = 30 * 1024 * 1024) {
    if (empty($_FILES[$fileField]) || $_FILES[$fileField]['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    $allowed = array_intersect_key(DOCUMENT_TYPES, array_flip($allowedExts));
    $size = (int) $_FILES[$fileField]['size'];
    $path = storeUpload($_FILES[$fileField], $folder, $allowed, $maxBytes, 'File');
    return ['path' => $path, 'size' => $size];
}

// Removes a previously stored upload. Only touches paths inside uploads/.
function deleteUpload($relativePath) {
    if (!$relativePath || strpos($relativePath, 'uploads/') !== 0 || strpos($relativePath, '..') !== false) {
        return;
    }
    $full = __DIR__ . '/../' . $relativePath;
    if (is_file($full)) {
        unlink($full);
    }
}
