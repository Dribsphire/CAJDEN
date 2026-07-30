<?php
require_once __DIR__ . '/../includes/bootstrap.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $partners = $pdo->query('SELECT * FROM partner_organizations ORDER BY sort_order ASC, org_name ASC')->fetchAll();
        respond(true, ['partners' => $partners]);
        break;

    case 'POST':
        requireAuth();
        $input = jsonInput();
        $name = sanitize($input['org_name'] ?? '');
        $sortOrder = (int) ($input['sort_order'] ?? 0);
        if ($name === '') respond(false, ['message' => 'Organization name is required.'], 422);
        $stmt = $pdo->prepare('INSERT INTO partner_organizations (org_name, sort_order, created_by) VALUES (:org_name, :sort_order, :admin_id)');
        $stmt->execute(['org_name' => $name, 'sort_order' => $sortOrder, 'admin_id' => currentAdminId()]);
        respond(true, ['message' => 'Partner organization added.', 'id' => $pdo->lastInsertId()], 201);
        break;

    case 'PUT':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'Partner id required.'], 422);
        $input = jsonInput();
        $fields = []; $params = ['id' => $id];
        if (isset($input['org_name'])) { $fields[] = 'org_name = :org_name'; $params['org_name'] = sanitize($input['org_name']); }
        if (isset($input['sort_order'])) { $fields[] = 'sort_order = :sort_order'; $params['sort_order'] = (int) $input['sort_order']; }
        if (empty($fields)) respond(false, ['message' => 'Nothing to update.'], 422);
        $pdo->prepare('UPDATE partner_organizations SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        respond(true, ['message' => 'Partner organization updated.']);
        break;

    case 'DELETE':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'Partner id required.'], 422);
        $pdo->prepare('DELETE FROM partner_organizations WHERE id = :id')->execute(['id' => $id]);
        respond(true, ['message' => 'Partner organization removed.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
