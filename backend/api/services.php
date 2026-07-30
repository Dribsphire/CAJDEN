<?php
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/upload.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && ($_GET['_method'] ?? '') === 'PUT') $method = 'PUT';

switch ($method) {
    case 'GET':
        if (!empty($_GET['id'])) {
            $stmt = $pdo->prepare('SELECT * FROM services WHERE id = :id');
            $stmt->execute(['id' => $_GET['id']]);
            $service = $stmt->fetch();
            if (!$service) respond(false, ['message' => 'Service not found.'], 404);
            respond(true, ['service' => $service]);
        }
        $services = $pdo->query('SELECT * FROM services ORDER BY created_at DESC')->fetchAll();
        respond(true, ['services' => $services]);
        break;

    case 'POST':
        requireAuth();
        $title = sanitize($_POST['title'] ?? '');
        $description = sanitize($_POST['description'] ?? '');
        $icon = sanitize($_POST['icon'] ?? 'FaHandsHelping');
        if ($title === '' || $description === '') {
            respond(false, ['message' => 'Title and description are required.'], 422);
        }
        $image = handleImageUpload('image', 'services');
        $stmt = $pdo->prepare('INSERT INTO services (title, description, icon, image_path, created_by)
            VALUES (:title, :description, :icon, :image_path, :admin_id)');
        $stmt->execute(['title' => $title, 'description' => $description, 'icon' => $icon,
            'image_path' => $image, 'admin_id' => currentAdminId()]);
        respond(true, ['message' => 'Service created.', 'id' => $pdo->lastInsertId()], 201);
        break;

    case 'PUT':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'Service id required.'], 422);
        $data = $_POST ?: jsonInput();
        $fields = []; $params = ['id' => $id];
        foreach (['title', 'description', 'icon'] as $f) {
            if (isset($data[$f])) { $fields[] = "$f = :$f"; $params[$f] = sanitize($data[$f]); }
        }
        $image = handleImageUpload('image', 'services');
        if ($image) { $fields[] = 'image_path = :image_path'; $params['image_path'] = $image; }
        if (empty($fields)) respond(false, ['message' => 'Nothing to update.'], 422);
        $pdo->prepare('UPDATE services SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        respond(true, ['message' => 'Service updated.']);
        break;

    case 'DELETE':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'Service id required.'], 422);
        $pdo->prepare('DELETE FROM services WHERE id = :id')->execute(['id' => $id]);
        respond(true, ['message' => 'Service deleted.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
