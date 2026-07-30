<?php
require_once __DIR__ . '/../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, ['message' => 'Method not allowed.'], 405);
}

$input = jsonInput();
$username = sanitize($input['username'] ?? '');
$password = $input['password'] ?? ''; // never htmlspecialchars a password before verifying

if ($username === '' || $password === '') {
    respond(false, ['message' => 'Username and password are required.'], 422);
}

$pdo = getDB();
$stmt = $pdo->prepare('SELECT id, username, email, password_hash, full_name FROM admins WHERE username = :u LIMIT 1');
$stmt->execute(['u' => $username]);
$admin = $stmt->fetch();

if (!$admin || !password_verify($password, $admin['password_hash'])) {
    respond(false, ['message' => 'Invalid username or password.'], 401);
}

session_regenerate_id(true);
$_SESSION['admin_id'] = $admin['id'];
$_SESSION['username'] = $admin['username'];
$_SESSION['full_name'] = $admin['full_name'];

respond(true, ['admin' => ['id' => $admin['id'], 'username' => $admin['username'], 'email' => $admin['email'], 'full_name' => $admin['full_name']]]);
