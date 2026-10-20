<?php
// =========================================================
// Photos inside an album (admin only). Listing happens through
// albums.php?id=, so this endpoint only adds, edits and removes.
// =========================================================
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/upload.php';

requireAuth();
$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    // POST /api/album_photos.php?album_id=3  (multipart: photos[])
    case 'POST':
        $albumId = (int) ($_GET['album_id'] ?? 0);
        $exists = $pdo->prepare('SELECT id FROM photo_albums WHERE id = :id');
        $exists->execute(['id' => $albumId]);
        if (!$exists->fetch()) respond(false, ['message' => 'Album not found.'], 404);

        $paths = handleMultipleImageUploads('photos', 'albums');
        if (!$paths) respond(false, ['message' => 'Choose at least one photo.'], 422);

        $next = $pdo->prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 FROM album_photos WHERE album_id = :id');
        $next->execute(['id' => $albumId]);
        $sort = (int) $next->fetchColumn();
        $insert = $pdo->prepare('INSERT INTO album_photos (album_id, image_path, sort_order) VALUES (:album_id, :path, :sort)');
        foreach ($paths as $path) {
            $insert->execute(['album_id' => $albumId, 'path' => $path, 'sort' => $sort++]);
        }
        respond(true, ['message' => count($paths) . ' photo(s) added.'], 201);
        break;

    // PUT /api/album_photos.php?id=12  JSON: { caption } or { make_cover: true }
    case 'PUT':
        $id = (int) ($_GET['id'] ?? 0);
        $photo = $pdo->prepare('SELECT id, album_id FROM album_photos WHERE id = :id');
        $photo->execute(['id' => $id]);
        $photo = $photo->fetch();
        if (!$photo) respond(false, ['message' => 'Photo not found.'], 404);
        $data = jsonInput();

        if (!empty($data['make_cover'])) {
            // Shift everything down one and put this photo first.
            $pdo->prepare('UPDATE album_photos SET sort_order = sort_order + 1 WHERE album_id = :album_id')->execute(['album_id' => $photo['album_id']]);
            $pdo->prepare('UPDATE album_photos SET sort_order = 0 WHERE id = :id')->execute(['id' => $id]);
        }
        if (array_key_exists('caption', $data)) {
            $pdo->prepare('UPDATE album_photos SET caption = :caption WHERE id = :id')
                ->execute(['caption' => sanitize($data['caption']) ?: null, 'id' => $id]);
        }
        respond(true, ['message' => 'Photo updated.']);
        break;

    case 'DELETE':
        $id = (int) ($_GET['id'] ?? 0);
        $stmt = $pdo->prepare('SELECT image_path FROM album_photos WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $path = $stmt->fetchColumn();
        if ($path === false) respond(false, ['message' => 'Photo not found.'], 404);
        $pdo->prepare('DELETE FROM album_photos WHERE id = :id')->execute(['id' => $id]);
        deleteUpload($path);
        respond(true, ['message' => 'Photo removed.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
