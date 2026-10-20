<?php
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/upload.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && ($_GET['_method'] ?? '') === 'PUT') $method = 'PUT';

// Cover = first photo by sort order; photo_count drives the "42 photos" tag.
const ALBUM_SELECT = 'SELECT a.*,
    (SELECT COUNT(*) FROM album_photos p WHERE p.album_id = a.id) AS photo_count,
    (SELECT p.image_path FROM album_photos p WHERE p.album_id = a.id ORDER BY p.sort_order, p.id LIMIT 1) AS cover_path
  FROM photo_albums a';

switch ($method) {
    // -----------------------------------------------------
    // GET /api/albums.php              -> list, newest first
    // GET /api/albums.php?id=3         -> album + its photos
    // Query params: category=, year=
    // -----------------------------------------------------
    case 'GET':
        if (!empty($_GET['id'])) {
            $stmt = $pdo->prepare(ALBUM_SELECT . ' WHERE a.id = :id');
            $stmt->execute(['id' => $_GET['id']]);
            $album = $stmt->fetch();
            if (!$album) respond(false, ['message' => 'Album not found.'], 404);
            $photos = $pdo->prepare('SELECT id, image_path, caption, sort_order FROM album_photos WHERE album_id = :id ORDER BY sort_order, id');
            $photos->execute(['id' => $album['id']]);
            $album['photos'] = $photos->fetchAll();
            respond(true, ['album' => $album]);
        }

        $where = []; $params = [];
        if (!empty($_GET['category'])) { $where[] = 'a.category = :category'; $params['category'] = sanitize($_GET['category']); }
        if (!empty($_GET['year'])) { $where[] = 'YEAR(COALESCE(a.event_date, a.created_at)) = :year'; $params['year'] = (int) $_GET['year']; }
        $sql = ALBUM_SELECT . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
            . ' ORDER BY COALESCE(a.event_date, DATE(a.created_at)) DESC, a.id DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $albums = $stmt->fetchAll();

        // Filter options for the public page, independent of the active filter.
        $categories = $pdo->query('SELECT DISTINCT category FROM photo_albums WHERE category IS NOT NULL AND category <> "" ORDER BY category')->fetchAll(PDO::FETCH_COLUMN);
        $years = $pdo->query('SELECT DISTINCT YEAR(COALESCE(event_date, created_at)) y FROM photo_albums ORDER BY y DESC')->fetchAll(PDO::FETCH_COLUMN);
        respond(true, ['albums' => $albums, 'categories' => $categories, 'years' => array_map('intval', $years)]);
        break;

    // -----------------------------------------------------
    // POST /api/albums.php  (multipart: title, category, description,
    //                        event_date, is_featured, photos[])
    // -----------------------------------------------------
    case 'POST':
        requireAuth();
        $title = sanitize($_POST['title'] ?? '');
        if ($title === '') respond(false, ['message' => 'Album title is required.'], 422);
        $isFeatured = !empty($_POST['is_featured']) && $_POST['is_featured'] !== '0';

        $photos = handleMultipleImageUploads('photos', 'albums');

        $pdo->beginTransaction();
        if ($isFeatured) $pdo->exec('UPDATE photo_albums SET is_featured = 0');
        $stmt = $pdo->prepare('INSERT INTO photo_albums (title, category, description, event_date, is_featured, created_by)
            VALUES (:title, :category, :description, :event_date, :is_featured, :admin_id)');
        $stmt->execute([
            'title' => $title,
            'category' => sanitize($_POST['category'] ?? '') ?: null,
            'description' => sanitize($_POST['description'] ?? '') ?: null,
            'event_date' => sanitize($_POST['event_date'] ?? '') ?: null,
            'is_featured' => $isFeatured ? 1 : 0,
            'admin_id' => currentAdminId(),
        ]);
        $albumId = $pdo->lastInsertId();
        $insert = $pdo->prepare('INSERT INTO album_photos (album_id, image_path, sort_order) VALUES (:album_id, :path, :sort)');
        foreach ($photos as $i => $path) {
            $insert->execute(['album_id' => $albumId, 'path' => $path, 'sort' => $i]);
        }
        $pdo->commit();
        respond(true, ['message' => 'Album created.', 'id' => $albumId], 201);
        break;

    // -----------------------------------------------------
    // PUT /api/albums.php?id=3  (album fields only; photos are managed
    //                            through album_photos.php)
    // -----------------------------------------------------
    case 'PUT':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'Album id required.'], 422);
        $data = $_POST ?: jsonInput();
        $fields = []; $params = ['id' => $id];
        foreach (['title', 'category', 'description', 'event_date'] as $f) {
            if (array_key_exists($f, $data)) {
                $fields[] = "$f = :$f";
                $value = sanitize($data[$f]);
                $params[$f] = ($value === '' && $f !== 'title') ? null : $value;
            }
        }
        if (isset($params['title']) && $params['title'] === '') respond(false, ['message' => 'Album title is required.'], 422);
        if (array_key_exists('is_featured', $data)) {
            $isFeatured = !empty($data['is_featured']) && $data['is_featured'] !== '0';
            if ($isFeatured) $pdo->prepare('UPDATE photo_albums SET is_featured = 0 WHERE id <> :id')->execute(['id' => $id]);
            $fields[] = 'is_featured = :is_featured';
            $params['is_featured'] = $isFeatured ? 1 : 0;
        }
        if (empty($fields)) respond(false, ['message' => 'Nothing to update.'], 422);
        $pdo->prepare('UPDATE photo_albums SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        respond(true, ['message' => 'Album updated.']);
        break;

    case 'DELETE':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'Album id required.'], 422);
        $paths = $pdo->prepare('SELECT image_path FROM album_photos WHERE album_id = :id');
        $paths->execute(['id' => $id]);
        $files = $paths->fetchAll(PDO::FETCH_COLUMN);
        $pdo->prepare('DELETE FROM photo_albums WHERE id = :id')->execute(['id' => $id]); // photos cascade
        foreach ($files as $path) deleteUpload($path);
        respond(true, ['message' => 'Album deleted.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
