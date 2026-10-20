<?php
// =========================================================
// Admin — upload an image to place inside a post's body
// (used by the rich text editor). Returns the stored path.
// POST multipart: image
// =========================================================
require_once __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/upload.php';

requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, ['message' => 'Method not allowed.'], 405);
}

$path = handleImageUpload('image', 'posts/inline');
if (!$path) respond(false, ['message' => 'Choose an image to upload.'], 422);

respond(true, ['path' => $path], 201);
