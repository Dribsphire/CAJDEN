<?php
require_once __DIR__ . '/../includes/bootstrap.php';

if (empty($_SESSION['admin_id'])) {
    respond(false, ['authenticated' => false], 200);
}

$pdo = getDB();
$stmt = $pdo->prepare('SELECT id, username, email, full_name FROM admins WHERE id = :id LIMIT 1');
$stmt->execute(['id' => $_SESSION['admin_id']]);
$admin = $stmt->fetch();

if (!$admin) {
    session_destroy();
    respond(false, ['authenticated' => false], 200);
}

respond(true, [
    'authenticated' => true,
    'admin' => $admin,
]);
