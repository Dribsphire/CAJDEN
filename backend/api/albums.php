<?php
// =========================================================
// Photo albums. Public visitors see published albums only;
// photos inside an album are managed through album_photos.php.
// =========================================================
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/upload.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && ($_GET['_method'] ?? '') === 'PUT') $method = 'PUT';

// Added after the first release; created on demand (see migrations/2026_10_album_visibility.sql).
if (!$pdo->query("SHOW COLUMNS FROM photo_albums LIKE 'is_published'")->fetch()) {
    $pdo->exec('ALTER TABLE photo_albums ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 1 AFTER is_featured');
}

// Cover = first photo by sort order; photo_count drives the "42 photos" tag.
const ALBUM_SELECT = 'SELECT a.*,
    (SELECT COUNT(*) FROM album_photos p WHERE p.album_id = a.id) AS photo_count,
    (SELECT p.image_path FROM album_photos p WHERE p.album_id = a.id ORDER BY p.sort_order, p.id LIMIT 1) AS cover_path
  FROM photo_albums a';

function isOn($value) {
    return !empty($value) && $value !== '0' && $value !== 'false';
}

function albumDate($value) {
    $value = trim((string) $value);
    if ($value === '') return null;
    $d = DateTime::createFromFormat('!Y-m-d', $value);
    if (!$d || $d->format('Y-m-d') !== $value) respond(false, ['message' => 'Invalid activity date.'], 422);
    return $value;
}

switch ($method) {
    // -----------------------------------------------------
    // GET /api/albums.php              -> published albums, newest activity first
    // GET /api/albums.php?all=1        -> every album incl. hidden (admin)
    // GET /api/albums.php?id=3         -> album + its photos (hidden: admin only)
    // Query params: category=, year=
    // -----------------------------------------------------
    case 'GET':
        $isAdmin = !empty($_SESSION['admin_id']);
        if (!empty($_GET['id'])) {
            $stmt = $pdo->prepare(ALBUM_SELECT . ' WHERE a.id = :id');
            $stmt->execute(['id' => $_GET['id']]);
            $album = $stmt->fetch();
            if (!$album || (!$album['is_published'] && !$isAdmin)) respond(false, ['message' => 'Album not found.'], 404);
            $photos = $pdo->prepare('SELECT id, image_path, caption, sort_order FROM album_photos WHERE album_id = :id ORDER BY sort_order, id');
            $photos->execute(['id' => $album['id']]);
            $album['photos'] = $photos->fetchAll();
            respond(true, ['album' => $album]);
        }

        $showAll = $isAdmin && !empty($_GET['all']);
        $base = $showAll ? [] : ['a.is_published = 1'];
        $where = $base; $params = [];
        if (!empty($_GET['category'])) { $where[] = 'a.category = :category'; $params['category'] = sanitize($_GET['category']); }
        if (!empty($_GET['year'])) { $where[] = 'YEAR(COALESCE(a.event_date, a.created_at)) = :year'; $params['year'] = (int) $_GET['year']; }
        $sql = ALBUM_SELECT . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
            . ' ORDER BY COALESCE(a.event_date, DATE(a.created_at)) DESC, a.id DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $albums = $stmt->fetchAll();

        // Filter options, independent of the active filter (and of hidden albums for the public).
        $visible = $showAll ? '' : ' AND is_published = 1';
        $categories = $pdo->query("SELECT DISTINCT category FROM photo_albums WHERE category IS NOT NULL AND category <> ''$visible ORDER BY category")->fetchAll(PDO::FETCH_COLUMN);
        $years = $pdo->query('SELECT DISTINCT YEAR(COALESCE(event_date, created_at)) y FROM photo_albums' . ($showAll ? '' : ' WHERE is_published = 1') . ' ORDER BY y DESC')->fetchAll(PDO::FETCH_COLUMN);
        respond(true, ['albums' => $albums, 'categories' => $categories, 'years' => array_map('intval', $years)]);
        break;

    // -----------------------------------------------------
    // POST /api/albums.php  (title, category, description, event_date,
    //                        is_featured, is_published)
    // Photos are uploaded afterwards through album_photos.php.
    // -----------------------------------------------------
    case 'POST':
        requireAuth();
        $data = $_POST ?: jsonInput();
        $title = sanitize($data['title'] ?? '');
        if ($title === '') respond(false, ['message' => 'Album title is required.'], 422);
        $isFeatured = isOn($data['is_featured'] ?? '');
        $isPublished = isOn($data['is_published'] ?? '1');

        $pdo->beginTransaction();
        if ($isFeatured) $pdo->exec('UPDATE photo_albums SET is_featured = 0'); // only one featured album
        $stmt = $pdo->prepare('INSERT INTO photo_albums (title, category, description, event_date, is_featured, is_published, created_by)
            VALUES (:title, :category, :description, :event_date, :featured, :published, :admin_id)');
        $stmt->execute([
            'title' => $title,
            'category' => sanitize($data['category'] ?? '') ?: null,
            'description' => sanitize($data['description'] ?? '') ?: null,
            'event_date' => albumDate($data['event_date'] ?? ''),
            'featured' => $isFeatured ? 1 : 0,
            'published' => $isPublished ? 1 : 0,
            'admin_id' => currentAdminId(),
        ]);
        $albumId = $pdo->lastInsertId();
        $pdo->commit();
        respond(true, ['message' => 'Album created.', 'id' => $albumId], 201);
        break;

    // PUT /api/albums.php?id=3  (any of the album fields above)
    case 'PUT':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        $exists = $pdo->prepare('SELECT id FROM photo_albums WHERE id = :id');
        $exists->execute(['id' => $id]);
        if (!$exists->fetch()) respond(false, ['message' => 'Album not found.'], 404);

        $data = $_POST ?: jsonInput();
        $fields = []; $params = ['id' => $id];
        foreach (['title', 'category', 'description'] as $f) {
            if (array_key_exists($f, $data)) {
                $fields[] = "$f = :$f";
                $value = sanitize($data[$f]);
                $params[$f] = ($value === '' && $f !== 'title') ? null : $value;
            }
        }
        if (isset($params['title']) && $params['title'] === '') respond(false, ['message' => 'Album title is required.'], 422);
        if (array_key_exists('event_date', $data)) { $fields[] = 'event_date = :event_date'; $params['event_date'] = albumDate($data['event_date']); }
        if (array_key_exists('is_published', $data)) { $fields[] = 'is_published = :published'; $params['published'] = isOn($data['is_published']) ? 1 : 0; }
        if (array_key_exists('is_featured', $data)) {
            $isFeatured = isOn($data['is_featured']);
            if ($isFeatured) $pdo->prepare('UPDATE photo_albums SET is_featured = 0 WHERE id <> :id')->execute(['id' => $id]);
            $fields[] = 'is_featured = :featured';
            $params['featured'] = $isFeatured ? 1 : 0;
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
