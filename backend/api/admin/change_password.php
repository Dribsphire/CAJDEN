<?php
// =========================================================
// Admin — change own password
// POST { current_password, new_password, confirm_password }
// =========================================================
require_once __DIR__ . '/../../includes/bootstrap.php';
requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, ['message' => 'Method not allowed.'], 405);
}

$input = jsonInput();
$currentPassword = (string) ($input['current_password'] ?? '');
$newPassword = (string) ($input['new_password'] ?? '');
$confirmPassword = (string) ($input['confirm_password'] ?? '');

if ($currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
    respond(false, ['message' => 'All fields are required.'], 422);
}

if (strlen($newPassword) < 8) {
    respond(false, ['message' => 'New password must be at least 8 characters long.'], 422);
}

if ($newPassword !== $confirmPassword) {
    respond(false, ['message' => 'New password and confirmation do not match.'], 422);
}

$pdo = getDB();
$stmt = $pdo->prepare('SELECT id, password_hash FROM admins WHERE id = :id LIMIT 1');
$stmt->execute(['id' => currentAdminId()]);
$admin = $stmt->fetch();

if (!$admin || !password_verify($currentPassword, $admin['password_hash'])) {
    respond(false, ['message' => 'Current password is incorrect.'], 401);
}

if (password_verify($newPassword, $admin['password_hash'])) {
    respond(false, ['message' => 'New password must be different from the current password.'], 422);
}

$newHash = password_hash($newPassword, PASSWORD_BCRYPT);
$pdo->prepare('UPDATE admins SET password_hash = :h WHERE id = :id')
    ->execute(['h' => $newHash, 'id' => currentAdminId()]);

// Invalidate the session so the admin must log back in with the new password.
session_destroy();

respond(true, ['message' => 'Password changed successfully. Please log in again.']);
