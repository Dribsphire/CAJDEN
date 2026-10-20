<?php
// =========================================================
// Downloadable materials (modules, reports, IEC posters, policies).
// Each material is either an uploaded file or an external link.
// Public downloads go through ?download= so they can be counted.
// =========================================================
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/upload.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && ($_GET['_method'] ?? '') === 'PUT') $method = 'PUT';

const MATERIAL_TYPES = ['module', 'report', 'poster', 'policy', 'other'];
const MATERIAL_FILE_TYPES = ['pdf', 'docx', 'pptx', 'xlsx'];

// Columns added after the first release; created on demand so existing
// databases keep working (see migrations/2026_10_materials_v2.sql).
function ensureMaterialColumns(PDO $pdo) {
    $cols = [];
    foreach ($pdo->query('SHOW COLUMNS FROM materials')->fetchAll() as $c) $cols[$c['Field']] = $c;
    $alter = [];
    if (!isset($cols['external_url'])) $alter[] = 'ADD COLUMN external_url VARCHAR(500) DEFAULT NULL AFTER file_size';
    if (!isset($cols['cover_image'])) $alter[] = 'ADD COLUMN cover_image VARCHAR(255) DEFAULT NULL AFTER external_url';
    if (!isset($cols['download_count'])) $alter[] = 'ADD COLUMN download_count INT NOT NULL DEFAULT 0 AFTER cover_image';
    if (!isset($cols['is_published'])) $alter[] = 'ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 1 AFTER is_featured';
    if (($cols['file_path']['Null'] ?? 'YES') === 'NO') $alter[] = 'MODIFY file_path VARCHAR(255) DEFAULT NULL'; // link-only materials
    if ($alter) $pdo->exec('ALTER TABLE materials ' . implode(', ', $alter));
}
ensureMaterialColumns($pdo);

function materialType($value) {
    return in_array($value, MATERIAL_TYPES, true) ? $value : 'other';
}

function isOn($value) {
    return !empty($value) && $value !== '0' && $value !== 'false';
}

function cleanUrl($value) {
    $url = trim((string) $value);
    if ($url === '') return null;
    if (!preg_match('~^https?://~i', $url) || !filter_var($url, FILTER_VALIDATE_URL) || strlen($url) > 500) {
        respond(false, ['message' => 'Enter a full link starting with http:// or https://'], 422);
    }
    return $url;
}

function materialYear($value) {
    $year = (int) $value;
    if (!$year) return null;
    if ($year < 1950 || $year > (int) date('Y') + 1) respond(false, ['message' => 'Enter a valid year.'], 422);
    return $year;
}

switch ($method) {
    // -----------------------------------------------------
    // GET /api/materials.php               -> published materials (featured first, then newest)
    // GET /api/materials.php?all=1         -> every material incl. hidden (admin)
    // GET /api/materials.php?id=4          -> one material (hidden: admin only)
    // GET /api/materials.php?download=4    -> counts the download, then redirects to the file or link
    // Query params: type=, search=
    // -----------------------------------------------------
    case 'GET':
        $isAdmin = !empty($_SESSION['admin_id']);

        if (!empty($_GET['download'])) {
            $stmt = $pdo->prepare('SELECT file_path, external_url, is_published FROM materials WHERE id = :id');
            $stmt->execute(['id' => (int) $_GET['download']]);
            $m = $stmt->fetch();
            if (!$m || (!$m['is_published'] && !$isAdmin)) respond(false, ['message' => 'Material not found.'], 404);
            if (!$isAdmin) $pdo->prepare('UPDATE materials SET download_count = download_count + 1 WHERE id = :id')->execute(['id' => (int) $_GET['download']]);
            header_remove('Content-Type');
            // Uploaded files live in backend/uploads/, one level up from this script.
            header('Location: ' . ($m['external_url'] ?: '../' . $m['file_path']), true, 302);
            exit;
        }

        if (!empty($_GET['id'])) {
            $stmt = $pdo->prepare('SELECT * FROM materials WHERE id = :id');
            $stmt->execute(['id' => (int) $_GET['id']]);
            $m = $stmt->fetch();
            if (!$m || (!$m['is_published'] && !$isAdmin)) respond(false, ['message' => 'Material not found.'], 404);
            respond(true, ['material' => $m]);
        }

        $where = ($isAdmin && !empty($_GET['all'])) ? [] : ['is_published = 1'];
        $params = [];
        if (!empty($_GET['type']) && in_array($_GET['type'], MATERIAL_TYPES, true)) {
            $where[] = 'type = :type';
            $params['type'] = $_GET['type'];
        }
        if (!empty($_GET['search'])) {
            // native prepares can't reuse one named placeholder, hence q1..q3
            $where[] = '(title LIKE :q1 OR description LIKE :q2 OR language LIKE :q3)';
            $q = '%' . sanitize($_GET['search']) . '%';
            $params += ['q1' => $q, 'q2' => $q, 'q3' => $q];
        }
        $sql = 'SELECT * FROM materials' . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
            . ' ORDER BY is_featured DESC, year DESC, created_at DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        respond(true, ['materials' => $stmt->fetchAll()]);
        break;

    // -----------------------------------------------------
    // POST /api/materials.php  multipart: title, type, description, language,
    //      year, is_featured, is_published, file | external_url, cover
    // -----------------------------------------------------
    case 'POST':
        requireAuth();
        $title = sanitize($_POST['title'] ?? '');
        if ($title === '') respond(false, ['message' => 'Title is required.'], 422);
        $url = cleanUrl($_POST['external_url'] ?? '');
        $file = handleDocumentUpload('file', 'materials', MATERIAL_FILE_TYPES);
        if (!$file && !$url) respond(false, ['message' => 'Attach a file or add a link people can open.'], 422);
        $cover = handleImageUpload('cover', 'materials');

        $stmt = $pdo->prepare('INSERT INTO materials
            (title, type, description, language, year, file_path, file_size, external_url, cover_image, is_featured, is_published, created_by)
            VALUES (:title, :type, :description, :language, :year, :path, :size, :url, :cover, :featured, :published, :admin_id)');
        $stmt->execute([
            'title' => $title,
            'type' => materialType($_POST['type'] ?? ''),
            'description' => sanitize($_POST['description'] ?? '') ?: null,
            'language' => sanitize($_POST['language'] ?? '') ?: null,
            'year' => materialYear($_POST['year'] ?? ''),
            'path' => $file['path'] ?? null,
            'size' => $file['size'] ?? null,
            'url' => $file ? null : $url, // an uploaded file wins over a link
            'cover' => $cover,
            'featured' => isOn($_POST['is_featured'] ?? '') ? 1 : 0,
            'published' => isOn($_POST['is_published'] ?? '1') ? 1 : 0,
            'admin_id' => currentAdminId(),
        ]);
        respond(true, ['message' => 'Material added.', 'id' => $pdo->lastInsertId()], 201);
        break;

    // PUT (POST + _method=PUT): same fields, plus remove_cover and source=file|link
    case 'PUT':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        $current = $pdo->prepare('SELECT file_path, external_url, cover_image FROM materials WHERE id = :id');
        $current->execute(['id' => $id]);
        $current = $current->fetch();
        if (!$current) respond(false, ['message' => 'Material not found.'], 404);

        $data = $_POST ?: jsonInput();
        $fields = []; $params = ['id' => $id];
        if (array_key_exists('title', $data)) {
            $params['title'] = sanitize($data['title']);
            if ($params['title'] === '') respond(false, ['message' => 'Title is required.'], 422);
            $fields[] = 'title = :title';
        }
        if (array_key_exists('type', $data)) { $fields[] = 'type = :type'; $params['type'] = materialType($data['type']); }
        foreach (['description', 'language'] as $f) {
            if (array_key_exists($f, $data)) { $fields[] = "$f = :$f"; $params[$f] = sanitize($data[$f]) ?: null; }
        }
        if (array_key_exists('year', $data)) { $fields[] = 'year = :year'; $params['year'] = materialYear($data['year']); }
        if (array_key_exists('is_featured', $data)) { $fields[] = 'is_featured = :featured'; $params['featured'] = isOn($data['is_featured']) ? 1 : 0; }
        if (array_key_exists('is_published', $data)) { $fields[] = 'is_published = :published'; $params['published'] = isOn($data['is_published']) ? 1 : 0; }

        // Source: a new upload, or switching to a link (which drops the old file).
        $file = handleDocumentUpload('file', 'materials', MATERIAL_FILE_TYPES);
        $dropFile = false;
        if ($file) {
            array_push($fields, 'file_path = :path', 'file_size = :size', 'external_url = NULL');
            $params['path'] = $file['path'];
            $params['size'] = $file['size'];
        } elseif (($data['source'] ?? '') === 'link') {
            $url = cleanUrl($data['external_url'] ?? '');
            if (!$url) respond(false, ['message' => 'Add the link people should open.'], 422);
            array_push($fields, 'external_url = :url', 'file_path = NULL', 'file_size = NULL');
            $params['url'] = $url;
            $dropFile = (bool) $current['file_path'];
        } elseif (!$current['file_path'] && !$current['external_url']) {
            respond(false, ['message' => 'Attach a file or add a link people can open.'], 422);
        }

        $cover = handleImageUpload('cover', 'materials');
        $removeCover = !$cover && isOn($data['remove_cover'] ?? '');
        if ($cover || $removeCover) { $fields[] = 'cover_image = :cover'; $params['cover'] = $cover ?: null; }

        if (empty($fields)) respond(false, ['message' => 'Nothing to update.'], 422);
        $pdo->prepare('UPDATE materials SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        if ($file || $dropFile) deleteUpload($current['file_path']);
        if ($cover || $removeCover) deleteUpload($current['cover_image']);
        respond(true, ['message' => 'Material updated.']);
        break;

    case 'DELETE':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        $stmt = $pdo->prepare('SELECT file_path, cover_image FROM materials WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $m = $stmt->fetch();
        if (!$m) respond(false, ['message' => 'Material not found.'], 404);
        $pdo->prepare('DELETE FROM materials WHERE id = :id')->execute(['id' => $id]);
        deleteUpload($m['file_path']);
        deleteUpload($m['cover_image']);
        respond(true, ['message' => 'Material deleted.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
