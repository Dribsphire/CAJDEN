<?php
require_once __DIR__ . '/../includes/bootstrap.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $rows = $pdo->query('SELECT setting_key, setting_value FROM settings')->fetchAll();
        $settings = [];
        foreach ($rows as $row) $settings[$row['setting_key']] = $row['setting_value'];
        respond(true, ['settings' => $settings]);
        break;

    case 'PUT':
        requireAuth();
        $input = jsonInput();
        $stmt = $pdo->prepare('INSERT INTO settings (setting_key, setting_value) VALUES (:k, :v)
            ON DUPLICATE KEY UPDATE setting_value = :v2');
        foreach ($input as $key => $value) {
            $clean = sanitize($value);
            $stmt->execute(['k' => sanitize($key), 'v' => $clean, 'v2' => $clean]);
        }
        respond(true, ['message' => 'Settings updated.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
