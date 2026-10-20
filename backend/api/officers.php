<?php
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/upload.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && ($_GET['_method'] ?? '') === 'PUT') $method = 'PUT';

switch ($method) {
    case 'GET':
        if (!empty($_GET['id'])) {
            $stmt = $pdo->prepare('SELECT * FROM officers WHERE id = :id');
            $stmt->execute(['id' => $_GET['id']]);
            $officer = $stmt->fetch();
            if (!$officer) respond(false, ['message' => 'Officer not found.'], 404);
            respond(true, ['officer' => $officer]);
        }
        // Ordered for the hierarchy tree: rank first, then manual sort_order
        $officers = $pdo->query('SELECT * FROM officers ORDER BY rank_level ASC, sort_order ASC, full_name ASC')->fetchAll();
        respond(true, ['officers' => $officers]);
        break;

    case 'POST':
        requireAuth();
        $fullName = sanitize($_POST['full_name'] ?? '');
        $position = sanitize($_POST['position_title'] ?? '');
        $rank = (int) ($_POST['rank_level'] ?? 3);
        $department = sanitize($_POST['department'] ?? '');
        $desc = sanitize($_POST['short_description'] ?? '');
        $sortOrder = (int) ($_POST['sort_order'] ?? 0);

        if ($fullName === '' || $position === '') {
            respond(false, ['message' => 'Full name and position are required.'], 422);
        }
        if (!in_array($rank, [1, 2, 3], true)) respond(false, ['message' => 'Invalid hierarchy level.'], 422);
        if ($rank === 3 && $department === '') {
            respond(false, ['message' => 'Department is required for department staff.'], 422);
        }

        $photo = handleImageUpload('photo', 'officers');
        $stmt = $pdo->prepare('INSERT INTO officers (full_name, position_title, rank_level, department, short_description, photo_path, sort_order, created_by)
            VALUES (:full_name, :position_title, :rank_level, :department, :short_description, :photo_path, :sort_order, :admin_id)');
        $stmt->execute([
            'full_name' => $fullName, 'position_title' => $position, 'rank_level' => $rank,
            'department' => $rank === 3 ? $department : null, 'short_description' => $desc,
            'photo_path' => $photo, 'sort_order' => $sortOrder, 'admin_id' => currentAdminId(),
        ]);
        respond(true, ['message' => 'Officer added.', 'id' => $pdo->lastInsertId()], 201);
        break;

    case 'PUT':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'Officer id required.'], 422);
        $current = $pdo->prepare('SELECT rank_level, department, photo_path FROM officers WHERE id = :id');
        $current->execute(['id' => $id]);
        $current = $current->fetch();
        if (!$current) respond(false, ['message' => 'Officer not found.'], 404);

        $data = $_POST ?: jsonInput();
        $fields = []; $params = ['id' => $id];
        foreach (['full_name', 'position_title', 'short_description', 'department'] as $f) {
            if (isset($data[$f])) { $fields[] = "$f = :$f"; $params[$f] = sanitize($data[$f]); }
        }
        foreach (['rank_level', 'sort_order'] as $f) {
            if (isset($data[$f])) { $fields[] = "$f = :$f"; $params[$f] = (int) $data[$f]; }
        }
        if ((isset($params['full_name']) && $params['full_name'] === '') || (isset($params['position_title']) && $params['position_title'] === '')) {
            respond(false, ['message' => 'Full name and position are required.'], 422);
        }
        $rank = $params['rank_level'] ?? (int) $current['rank_level'];
        if (!in_array($rank, [1, 2, 3], true)) respond(false, ['message' => 'Invalid hierarchy level.'], 422);
        $department = array_key_exists('department', $params) ? $params['department'] : (string) $current['department'];
        if ($rank === 3 && $department === '') respond(false, ['message' => 'Department is required for department staff.'], 422);
        // Only department staff belong to a department.
        if ($rank !== 3) {
            if (!array_key_exists('department', $params)) $fields[] = 'department = :department';
            $params['department'] = null;
        }

        $photo = handleImageUpload('photo', 'officers');
        $removePhoto = !$photo && !empty($data['remove_photo']) && $data['remove_photo'] !== '0';
        if ($photo || $removePhoto) { $fields[] = 'photo_path = :photo_path'; $params['photo_path'] = $photo ?: null; }
        if (empty($fields)) respond(false, ['message' => 'Nothing to update.'], 422);
        $pdo->prepare('UPDATE officers SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        if ($photo || $removePhoto) deleteUpload($current['photo_path']);
        respond(true, ['message' => 'Officer updated.']);
        break;

    case 'DELETE':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'Officer id required.'], 422);
        $stmt = $pdo->prepare('SELECT photo_path FROM officers WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $photoPath = $stmt->fetchColumn();
        $pdo->prepare('DELETE FROM officers WHERE id = :id')->execute(['id' => $id]);
        if ($photoPath) deleteUpload($photoPath);
        respond(true, ['message' => 'Officer removed.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
