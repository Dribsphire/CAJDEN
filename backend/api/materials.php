<?php
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/upload.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && ($_GET['_method'] ?? '') === 'PUT') $method = 'PUT';

const MATERIAL_TYPES = ['module', 'report', 'poster', 'policy', 'other'];
const MATERIAL_FILE_TYPES = ['pdf', 'docx', 'pptx', 'xlsx'];

function materialType($value) {
    return in_array($value, MATERIAL_TYPES, true) ? $value : 'other';
}

switch ($method) {
    // -----------------------------------------------------
    // GET /api/materials.php           -> list (featured first, then newest)
    // Query params: type=, search=
    // -----------------------------------------------------
    case 'GET':
        $where = []; $params = [];
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
    // POST /api/materials.php (multipart: title, type, description,
    //                          language, year, is_featured, file)
    // -----------------------------------------------------
    case 'POST':
        requireAuth();
        $title = sanitize($_POST['title'] ?? '');
        if ($title === '') respond(false, ['message' => 'Title is required.'], 422);
        $file = handleDocumentUpload('file', 'materials', MATERIAL_FILE_TYPES);
        if (!$file) respond(false, ['message' => 'Attach the file people will download.'], 422);
        $year = (int) ($_POST['year'] ?? 0);
        $stmt = $pdo->prepare('INSERT INTO materials (title, type, description, language, year, file_path, file_size, is_featured, created_by)
            VALUES (:title, :type, :description, :language, :year, :path, :size, :featured, :admin_id)');
        $stmt->execute([
            'title' => $title,
            'type' => materialType($_POST['type'] ?? ''),
            'description' => sanitize($_POST['description'] ?? '') ?: null,
            'language' => sanitize($_POST['language'] ?? '') ?: null,
            'year' => $year > 0 ? $year : null,
            'path' => $file['path'],
            'size' => $file['size'],
            'featured' => !empty($_POST['is_featured']) && $_POST['is_featured'] !== '0' ? 1 : 0,
            'admin_id' => currentAdminId(),
        ]);
        respond(true, ['message' => 'Material added.', 'id' => $pdo->lastInsertId()], 201);
        break;

    case 'PUT':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        $current = $pdo->prepare('SELECT file_path FROM materials WHERE id = :id');
        $current->execute(['id' => $id]);
        $oldPath = $current->fetchColumn();
        if ($oldPath === false) respond(false, ['message' => 'Material not found.'], 404);

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
        if (array_key_exists('year', $data)) { $fields[] = 'year = :year'; $params['year'] = (int) $data['year'] ?: null; }
        if (array_key_exists('is_featured', $data)) {
            $fields[] = 'is_featured = :featured';
            $params['featured'] = !empty($data['is_featured']) && $data['is_featured'] !== '0' ? 1 : 0;
        }
        $file = handleDocumentUpload('file', 'materials', MATERIAL_FILE_TYPES);
        if ($file) {
            $fields[] = 'file_path = :path'; $params['path'] = $file['path'];
            $fields[] = 'file_size = :size'; $params['size'] = $file['size'];
        }
        if (empty($fields)) respond(false, ['message' => 'Nothing to update.'], 422);
        $pdo->prepare('UPDATE materials SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        if ($file) deleteUpload($oldPath);
        respond(true, ['message' => 'Material updated.']);
        break;

    case 'DELETE':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        $stmt = $pdo->prepare('SELECT file_path FROM materials WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $path = $stmt->fetchColumn();
        if ($path === false) respond(false, ['message' => 'Material not found.'], 404);
        $pdo->prepare('DELETE FROM materials WHERE id = :id')->execute(['id' => $id]);
        deleteUpload($path);
        respond(true, ['message' => 'Material deleted.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
