<?php
// =========================================================
// Programs ("services"). Public visitors only see published
// programs, in display order; the homepage shows the first four.
// =========================================================
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/upload.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && ($_GET['_method'] ?? '') === 'PUT') $method = 'PUT';

// Columns added after the first release. Created on demand so an existing
// database keeps working even if migrations/2026_10_programs.sql wasn't run.
function ensureServiceColumns(PDO $pdo) {
    $have = array_column($pdo->query('SHOW COLUMNS FROM services')->fetchAll(), 'Field');
    $add = [
        'summary' => 'ADD COLUMN summary VARCHAR(300) DEFAULT NULL AFTER title',
        'sort_order' => 'ADD COLUMN sort_order INT NOT NULL DEFAULT 0',
        'is_published' => 'ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 1',
    ];
    $missing = array_diff_key($add, array_flip($have));
    if ($missing) $pdo->exec('ALTER TABLE services ' . implode(', ', $missing));
}
ensureServiceColumns($pdo);

const SERVICE_ORDER = 'ORDER BY sort_order ASC, created_at ASC, id ASC';

function isOn($value) {
    return !empty($value) && $value !== '0' && $value !== 'false';
}

// Inline photos placed in the description by the editor.
function inlineImages($html) {
    preg_match_all('~src="(uploads/posts/inline/[\w.-]+)"~', (string) $html, $m);
    return $m[1];
}

switch ($method) {
    // -----------------------------------------------------
    // GET /api/services.php          -> published programs, in order
    // GET /api/services.php?all=1    -> every program (admin only)
    // GET /api/services.php?id=3     -> one program (hidden ones: admin only)
    // -----------------------------------------------------
    case 'GET':
        $isAdmin = !empty($_SESSION['admin_id']);
        if (!empty($_GET['id'])) {
            $stmt = $pdo->prepare('SELECT * FROM services WHERE id = :id');
            $stmt->execute(['id' => $_GET['id']]);
            $service = $stmt->fetch();
            if (!$service || (!$service['is_published'] && !$isAdmin)) respond(false, ['message' => 'Program not found.'], 404);
            respond(true, ['service' => $service]);
        }
        $where = ($isAdmin && !empty($_GET['all'])) ? '' : 'WHERE is_published = 1';
        $services = $pdo->query("SELECT * FROM services $where " . SERVICE_ORDER)->fetchAll();
        respond(true, ['services' => $services]);
        break;

    // -----------------------------------------------------
    // POST /api/services.php?action=reorder   JSON { order: [id, id, ...] }
    // POST /api/services.php                  multipart: title, summary,
    //      description (HTML), is_published, image
    // -----------------------------------------------------
    case 'POST':
        requireAuth();
        if (($_GET['action'] ?? '') === 'reorder') {
            $ids = array_map('intval', (array) (jsonInput()['order'] ?? []));
            if (!$ids) respond(false, ['message' => 'No order given.'], 422);
            $stmt = $pdo->prepare('UPDATE services SET sort_order = :o WHERE id = :id');
            $pdo->beginTransaction();
            foreach ($ids as $i => $id) $stmt->execute(['o' => $i + 1, 'id' => $id]);
            $pdo->commit();
            respond(true, ['message' => 'Order saved.']);
        }

        $title = sanitize($_POST['title'] ?? '');
        $summary = sanitize($_POST['summary'] ?? '');
        $description = trim((string) ($_POST['description'] ?? '')); // editor HTML, sanitized when rendered
        if ($title === '' || $description === '') {
            respond(false, ['message' => 'Title and description are required.'], 422);
        }
        if (mb_strlen($summary) > 300) respond(false, ['message' => 'Summary is limited to 300 characters.'], 422);
        $image = handleImageUpload('image', 'services');
        $next = (int) $pdo->query('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM services')->fetchColumn();
        $stmt = $pdo->prepare('INSERT INTO services (title, summary, description, image_path, is_published, sort_order, created_by)
            VALUES (:title, :summary, :description, :image_path, :pub, :sort, :admin_id)');
        $stmt->execute([
            'title' => $title, 'summary' => $summary ?: null, 'description' => $description,
            'image_path' => $image, 'pub' => isOn($_POST['is_published'] ?? '1') ? 1 : 0,
            'sort' => $next, 'admin_id' => currentAdminId(),
        ]);
        respond(true, ['message' => 'Program added.', 'id' => $pdo->lastInsertId()], 201);
        break;

    // PUT (POST + _method=PUT) multipart: any of the fields above, plus remove_image
    case 'PUT':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        $current = $pdo->prepare('SELECT image_path, description FROM services WHERE id = :id');
        $current->execute(['id' => $id]);
        $current = $current->fetch();
        if (!$current) respond(false, ['message' => 'Program not found.'], 404);

        $data = $_POST ?: jsonInput();
        $fields = []; $params = ['id' => $id];
        foreach (['title', 'summary'] as $f) {
            if (isset($data[$f])) { $fields[] = "$f = :$f"; $params[$f] = sanitize($data[$f]); }
        }
        if (isset($data['description'])) { $fields[] = 'description = :description'; $params['description'] = trim((string) $data['description']); }
        if (isset($data['is_published'])) { $fields[] = 'is_published = :pub'; $params['pub'] = isOn($data['is_published']) ? 1 : 0; }
        if ((isset($params['title']) && $params['title'] === '') || (isset($params['description']) && $params['description'] === '')) {
            respond(false, ['message' => 'Title and description are required.'], 422);
        }
        if (isset($params['summary'])) {
            if (mb_strlen($params['summary']) > 300) respond(false, ['message' => 'Summary is limited to 300 characters.'], 422);
            if ($params['summary'] === '') $params['summary'] = null;
        }

        $image = handleImageUpload('image', 'services');
        $removeImage = !$image && isOn($data['remove_image'] ?? '');
        if ($image || $removeImage) { $fields[] = 'image_path = :image_path'; $params['image_path'] = $image ?: null; }
        if (empty($fields)) respond(false, ['message' => 'Nothing to update.'], 422);
        $pdo->prepare('UPDATE services SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);

        if ($image || $removeImage) deleteUpload($current['image_path']);
        // Photos removed from the description are deleted too.
        if (isset($params['description'])) {
            foreach (array_diff(inlineImages($current['description']), inlineImages($params['description'])) as $path) deleteUpload($path);
        }
        respond(true, ['message' => 'Program updated.']);
        break;

    case 'DELETE':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        $stmt = $pdo->prepare('SELECT image_path, description FROM services WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        if (!$row) respond(false, ['message' => 'Program not found.'], 404);
        $pdo->prepare('DELETE FROM services WHERE id = :id')->execute(['id' => $id]);
        deleteUpload($row['image_path']);
        foreach (inlineImages($row['description']) as $path) deleteUpload($path);
        respond(true, ['message' => 'Program deleted.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
