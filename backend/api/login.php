<?php
require_once __DIR__ . '/../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, ['message' => 'Method not allowed.'], 405);
}

// ---- Brute-force protection ----
// Too many failures for one username from one IP, or from one IP overall,
// within the window locks further attempts until the window passes.
const LOGIN_WINDOW_MINUTES = 15;
const MAX_FAILS_PER_ACCOUNT = 5;   // same IP + same username
const MAX_FAILS_PER_IP = 20;       // same IP, any usernames

$pdo = getDB();

// Created on demand so an existing database needs no manual migration
// (a missing table here would otherwise lock every admin out).
$pdo->exec('CREATE TABLE IF NOT EXISTS login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  username VARCHAR(50) NOT NULL,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ip_time (ip_address, attempted_at)
) ENGINE=InnoDB');

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$input = jsonInput();
$username = sanitize($input['username'] ?? '');
$password = $input['password'] ?? ''; // never htmlspecialchars a password before verifying

if ($username === '' || $password === '') {
    respond(false, ['message' => 'Username and password are required.'], 422);
}

$pdo->prepare('DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL ' . LOGIN_WINDOW_MINUTES . ' MINUTE')->execute();

$stmt = $pdo->prepare('SELECT COUNT(*) AS ip_fails, SUM(username = :u) AS account_fails, MIN(attempted_at) AS oldest
    FROM login_attempts WHERE ip_address = :ip');
$stmt->execute(['ip' => $ip, 'u' => $username]);
$fails = $stmt->fetch();

if ((int) $fails['account_fails'] >= MAX_FAILS_PER_ACCOUNT || (int) $fails['ip_fails'] >= MAX_FAILS_PER_IP) {
    $wait = $pdo->query('SELECT GREATEST(1, CEIL(TIMESTAMPDIFF(SECOND, NOW(), ' . $pdo->quote($fails['oldest']) . ' + INTERVAL ' . LOGIN_WINDOW_MINUTES . ' MINUTE) / 60))')->fetchColumn();
    respond(false, ['message' => "Too many failed attempts. Please try again in $wait minute(s)."], 429);
}

$stmt = $pdo->prepare('SELECT id, username, email, password_hash, full_name FROM admins WHERE username = :u LIMIT 1');
$stmt->execute(['u' => $username]);
$admin = $stmt->fetch();

if (!$admin || !password_verify($password, $admin['password_hash'])) {
    $pdo->prepare('INSERT INTO login_attempts (ip_address, username) VALUES (:ip, :u)')
        ->execute(['ip' => $ip, 'u' => mb_substr($username, 0, 50)]);
    $left = MAX_FAILS_PER_ACCOUNT - (int) $fails['account_fails'] - 1;
    $hint = $left <= 0
        ? ' Too many failed attempts; please wait ' . LOGIN_WINDOW_MINUTES . ' minutes before trying again.'
        : ($left <= 2 ? " $left attempt(s) left before a " . LOGIN_WINDOW_MINUTES . '-minute lockout.' : '');
    respond(false, ['message' => 'Invalid username or password.' . $hint], 401);
}

// Successful login clears this account's failure history from this IP.
$pdo->prepare('DELETE FROM login_attempts WHERE ip_address = :ip AND username = :u')->execute(['ip' => $ip, 'u' => $username]);

session_regenerate_id(true);
$_SESSION['admin_id'] = $admin['id'];
$_SESSION['username'] = $admin['username'];
$_SESSION['full_name'] = $admin['full_name'];

respond(true, ['admin' => ['id' => $admin['id'], 'username' => $admin['username'], 'email' => $admin['email'], 'full_name' => $admin['full_name']]]);
