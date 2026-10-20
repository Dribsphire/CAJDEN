<?php
// =========================================================
// Photos inside an album (admin only). Listing happens through
// albums.php?id=, so this endpoint only adds, edits and removes.
//   POST   ?album_id=3                 multipart photos[]  -> add (appended)
//   POST   ?album_id=3&action=reorder  JSON { order: [photoId, ...] }  (first = cover)
//   POST   ?album_id=3&action=delete   JSON { ids: [photoId, ...] }    -> bulk remove
//   PUT    ?id=12                      JSON { caption } or { make_cover: true }
//   DELETE ?id=12
// =========================================================
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/upload.php';

requireAuth();
$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

function albumExists(PDO $pdo, $albumId) {
    $stmt = $pdo->prepare('SELECT id FROM photo_albums WHERE id = :id');
    $stmt->execute(['id' => $albumId]);
    return (bool) $stmt->fetch();
}

switch ($method) {
    case 'POST':
        $albumId = (int) ($_GET['album_id'] ?? 0);
        if (!albumExists($pdo, $albumId)) respond(false, ['message' => 'Album not found.'], 404);
        $action = $_GET['action'] ?? '';

        if ($action === 'reorder') {
            $ids = array_map('intval', (array) (jsonInput()['order'] ?? []));
            if (!$ids) respond(false, ['message' => 'No order given.'], 422);
            $stmt = $pdo->prepare('UPDATE album_photos SET sort_order = :o WHERE id = :id AND album_id = :album_id');
            $pdo->beginTransaction();
            foreach ($ids as $i => $id) $stmt->execute(['o' => $i, 'id' => $id, 'album_id' => $albumId]);
            $pdo->commit();
            respond(true, ['message' => 'Order saved.']);
        }

        if ($action === 'delete') {
            $ids = array_map('intval', (array) (jsonInput()['ids'] ?? []));
            if (!$ids) respond(false, ['message' => 'No photos selected.'], 422);
            $marks = implode(',', array_fill(0, count($ids), '?'));
            $stmt = $pdo->prepare("SELECT image_path FROM album_photos WHERE album_id = ? AND id IN ($marks)");
            $stmt->execute(array_merge([$albumId], $ids));
            $paths = $stmt->fetchAll(PDO::FETCH_COLUMN);
            $pdo->prepare("DELETE FROM album_photos WHERE album_id = ? AND id IN ($marks)")->execute(array_merge([$albumId], $ids));
            foreach ($paths as $path) deleteUpload($path);
            respond(true, ['message' => count($paths) . ' photo(s) removed.']);
        }

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
            $caption = mb_substr(sanitize($data['caption']), 0, 255);
            $pdo->prepare('UPDATE album_photos SET caption = :caption WHERE id = :id')
                ->execute(['caption' => $caption === '' ? null : $caption, 'id' => $id]);
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
