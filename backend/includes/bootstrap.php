<?php
// =========================================================
// Shared bootstrap included by every API endpoint.
// Handles CORS, sessions, JSON body parsing and helpers.
// =========================================================

require_once __DIR__ . '/env.php';
loadAppEnv();

// One timezone for PHP and MySQL so publish dates and scheduling line up.
date_default_timezone_set(env('APP_TIMEZONE', 'Asia/Manila'));

// ---- CORS ----
// Must exactly match the URL your React app runs on (set in backend/.env).
$allowedOrigin = env('APP_FRONTEND_URL', 'http://localhost:5173');
header("Access-Control-Allow-Origin: $allowedOrigin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// httponly keeps the session id away from JavaScript; secure is only set
// over HTTPS so local XAMPP (plain http) logins keep working.
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || ($_SERVER['SERVER_PORT'] ?? null) == 443
    || strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
ini_set('session.use_strict_mode', '1'); // ignore session ids the server never issued
session_set_cookie_params([
    'lifetime' => 86400,
    'path' => '/',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

require_once __DIR__ . '/../config/db.php';

// ---- Helpers ----
function jsonInput() {
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function respond($success, $payload = [], $code = 200) {
    http_response_code($code);
    echo json_encode(array_merge(['success' => $success], $payload));
    exit;
}

function sanitize($value) {
    if (is_array($value)) {
        return array_map('sanitize', $value);
    }
    return trim((string) $value);
}

function requireAuth() {
    if (empty($_SESSION['admin_id'])) {
        respond(false, ['message' => 'Unauthorized. Please log in.'], 401);
    }
}

function currentAdminId() {
    return $_SESSION['admin_id'] ?? null;
}
