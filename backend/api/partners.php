<?php
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/upload.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
// Multipart (photo) updates arrive as POST + ?_method=PUT, like the other endpoints.
if ($method === 'POST' && ($_GET['_method'] ?? '') === 'PUT') $method = 'PUT';

// Older databases predate FBPO photos; add the column on first write so the
// site keeps working even if migrations/2026_10_partner_photos.sql wasn't run.
function ensurePartnerPhotoColumn(PDO $pdo) {
    $has = $pdo->query("SHOW COLUMNS FROM partner_organizations LIKE 'photo_path'")->fetch();
    if (!$has) $pdo->exec('ALTER TABLE partner_organizations ADD COLUMN photo_path VARCHAR(255) DEFAULT NULL AFTER org_name');
}

switch ($method) {
    case 'GET':
        // Display order doesn't matter for FBPOs; alphabetical keeps it predictable.
        $partners = $pdo->query('SELECT * FROM partner_organizations ORDER BY org_name ASC')->fetchAll();
        respond(true, ['partners' => $partners]);
        break;

    // POST multipart: org_name, photo (optional)
    case 'POST':
        requireAuth();
        ensurePartnerPhotoColumn($pdo);
        $name = sanitize($_POST['org_name'] ?? '');
        if ($name === '') respond(false, ['message' => 'Organization name is required.'], 422);
        $photo = handleImageUpload('photo', 'partners');
        $stmt = $pdo->prepare('INSERT INTO partner_organizations (org_name, photo_path, created_by) VALUES (:org_name, :photo, :admin_id)');
        $stmt->execute(['org_name' => $name, 'photo' => $photo, 'admin_id' => currentAdminId()]);
        respond(true, ['message' => 'FBPO added.', 'id' => $pdo->lastInsertId()], 201);
        break;

    // PUT (POST + _method=PUT) multipart: org_name, photo, remove_photo
    case 'PUT':
        requireAuth();
        ensurePartnerPhotoColumn($pdo);
        $id = (int) ($_GET['id'] ?? 0);
        $current = $pdo->prepare('SELECT photo_path FROM partner_organizations WHERE id = :id');
        $current->execute(['id' => $id]);
        $oldPhoto = $current->fetchColumn();
        if ($oldPhoto === false) respond(false, ['message' => 'FBPO not found.'], 404);

        $data = $_POST ?: jsonInput();
        $fields = []; $params = ['id' => $id];
        if (isset($data['org_name'])) {
            $params['org_name'] = sanitize($data['org_name']);
            if ($params['org_name'] === '') respond(false, ['message' => 'Organization name is required.'], 422);
            $fields[] = 'org_name = :org_name';
        }
        $photo = handleImageUpload('photo', 'partners');
        $removePhoto = !$photo && !empty($data['remove_photo']) && $data['remove_photo'] !== '0';
        if ($photo || $removePhoto) { $fields[] = 'photo_path = :photo'; $params['photo'] = $photo ?: null; }
        if (empty($fields)) respond(false, ['message' => 'Nothing to update.'], 422);
        $pdo->prepare('UPDATE partner_organizations SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        if ($photo || $removePhoto) deleteUpload($oldPhoto);
        respond(true, ['message' => 'FBPO updated.']);
        break;

    case 'DELETE':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'FBPO id required.'], 422);
        $stmt = $pdo->prepare('SELECT * FROM partner_organizations WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        $pdo->prepare('DELETE FROM partner_organizations WHERE id = :id')->execute(['id' => $id]);
        if (!empty($row['photo_path'])) deleteUpload($row['photo_path']);
        respond(true, ['message' => 'FBPO removed.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
