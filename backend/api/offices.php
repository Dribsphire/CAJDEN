<?php
require_once __DIR__ . '/../includes/bootstrap.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $offices = $pdo->query('SELECT * FROM offices ORDER BY is_main DESC, office_name ASC')->fetchAll();
        respond(true, ['offices' => $offices]);
        break;

    case 'POST':
        requireAuth();
        $input = jsonInput();
        $name = sanitize($input['office_name'] ?? '');
        $address = sanitize($input['address'] ?? '');
        $contact = sanitize($input['contact_number'] ?? '');
        $lat = $input['latitude'] ?? null;
        $lng = $input['longitude'] ?? null;
        $isMain = !empty($input['is_main']) ? 1 : 0;

        if ($name === '' || $address === '' || $lat === null || $lng === null) {
            respond(false, ['message' => 'Office name, address, latitude and longitude are required.'], 422);
        }
        if (!is_numeric($lat) || !is_numeric($lng)) {
            respond(false, ['message' => 'Latitude and longitude must be numeric.'], 422);
        }

        $stmt = $pdo->prepare('INSERT INTO offices (office_name, address, contact_number, latitude, longitude, is_main, created_by)
            VALUES (:office_name, :address, :contact_number, :latitude, :longitude, :is_main, :admin_id)');
        $stmt->execute([
            'office_name' => $name, 'address' => $address, 'contact_number' => $contact,
            'latitude' => $lat, 'longitude' => $lng, 'is_main' => $isMain, 'admin_id' => currentAdminId(),
        ]);
        respond(true, ['message' => 'Office added.', 'id' => $pdo->lastInsertId()], 201);
        break;

    case 'PUT':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'Office id required.'], 422);
        $input = jsonInput();
        $fields = []; $params = ['id' => $id];
        foreach (['office_name', 'address', 'contact_number'] as $f) {
            if (isset($input[$f])) { $fields[] = "$f = :$f"; $params[$f] = sanitize($input[$f]); }
        }
        foreach (['latitude', 'longitude'] as $f) {
            if (isset($input[$f])) { $fields[] = "$f = :$f"; $params[$f] = $input[$f]; }
        }
        if (isset($input['is_main'])) { $fields[] = 'is_main = :is_main'; $params['is_main'] = $input['is_main'] ? 1 : 0; }
        if (empty($fields)) respond(false, ['message' => 'Nothing to update.'], 422);
        $pdo->prepare('UPDATE offices SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        respond(true, ['message' => 'Office updated.']);
        break;

    case 'DELETE':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'Office id required.'], 422);
        $pdo->prepare('DELETE FROM offices WHERE id = :id')->execute(['id' => $id]);
        respond(true, ['message' => 'Office removed.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
