<?php
// =========================================================
// Admin — view / update own account info (name, email)
// GET  -> current admin profile
// PUT  -> { full_name, email }
// =========================================================
require_once __DIR__ . '/../../includes/bootstrap.php';
requireAuth();

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$adminId = currentAdminId();

switch ($method) {
    case 'GET':
        $stmt = $pdo->prepare('SELECT id, username, email, full_name, created_at FROM admins WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $adminId]);
        $admin = $stmt->fetch();
        if (!$admin) respond(false, ['message' => 'Admin not found.'], 404);
        respond(true, ['admin' => $admin]);
        break;

    case 'PUT':
        $input = jsonInput();
        $fullName = sanitize($input['full_name'] ?? '');
        $email = sanitize($input['email'] ?? '');

        if ($fullName === '' || $email === '') {
            respond(false, ['message' => 'Full name and email are required.'], 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(false, ['message' => 'Please provide a valid email address.'], 422);
        }

        // Make sure the email isn't already used by another admin account.
        $check = $pdo->prepare('SELECT id FROM admins WHERE email = :email AND id != :id LIMIT 1');
        $check->execute(['email' => $email, 'id' => $adminId]);
        if ($check->fetch()) {
            respond(false, ['message' => 'That email is already in use by another account.'], 409);
        }

        $pdo->prepare('UPDATE admins SET full_name = :n, email = :e WHERE id = :id')
            ->execute(['n' => $fullName, 'e' => $email, 'id' => $adminId]);

        $_SESSION['full_name'] = $fullName;

        respond(true, ['message' => 'Profile updated successfully.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
