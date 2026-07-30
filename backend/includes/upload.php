<?php
// =========================================================
// Handles image uploads for officers, services and posts.
// Saves file to /uploads/{folder}/ and returns a relative path
// to store in MySQL (never store binary data in the DB).
// =========================================================

function handleImageUpload($fileField, $folder) {
    if (empty($_FILES[$fileField]) || $_FILES[$fileField]['error'] === UPLOAD_ERR_NO_FILE) {
        return null; // no file uploaded, that's fine (optional field)
    }

    $file = $_FILES[$fileField];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        respond(false, ['message' => 'Image upload failed.'], 400);
    }

    $allowed = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if (!array_key_exists($ext, $allowed)) {
        respond(false, ['message' => 'Invalid file type. Only JPG, PNG, WEBP allowed.'], 400);
    }

    if ($file['size'] > 5 * 1024 * 1024) {
        respond(false, ['message' => 'Image too large. Max 5MB.'], 400);
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if ($mime !== $allowed[$ext]) {
        respond(false, ['message' => 'File content does not match its extension.'], 400);
    }

    $uploadDir = __DIR__ . '/../uploads/' . $folder . '/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $filename = bin2hex(random_bytes(8)) . '.' . $ext;
    $destination = $uploadDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        respond(false, ['message' => 'Could not save uploaded file.'], 500);
    }

    // relative path stored in DB, served via /backend/uploads/...
    return 'uploads/' . $folder . '/' . $filename;
}
