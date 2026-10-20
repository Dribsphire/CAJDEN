<?php
// =========================================================
// Admin account seeder — creates an admin, or resets the
// password of an existing one. Command line only.
//
//   php backend/scripts/seed_admin.php <username> [password] [email] [full name]
//
// If the password is omitted, a random one is generated and printed.
// Uses the same DB settings as the API (backend/.env, plus
// backend/.env.local when present), so run it on the machine whose
// database you want to change.
// =========================================================

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../config/db.php';

// config/db.php reports connection errors as JSON for the API; add a line
// break so the message reads cleanly in a terminal.
register_shutdown_function(function () { echo PHP_EOL; });

$username = trim($argv[1] ?? '');
if ($username === '' || in_array($username, ['-h', '--help'], true)) {
    fwrite(STDERR, "Usage: php backend/scripts/seed_admin.php <username> [password] [email] [full name]\n");
    exit(1);
}

$password = $argv[2] ?? '';
$generated = $password === '';
if ($generated) {
    // 16 chars from an alphabet without look-alikes (0/O, 1/l/I)
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    for ($i = 0; $i < 16; $i++) {
        $password .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
} elseif (strlen($password) < 8) {
    fwrite(STDERR, "Password must be at least 8 characters.\n");
    exit(1);
}

$pdo = getDB();
$hash = password_hash($password, PASSWORD_BCRYPT);

$stmt = $pdo->prepare('SELECT id FROM admins WHERE username = :u');
$stmt->execute(['u' => $username]);
$existingId = $stmt->fetchColumn();

if ($existingId) {
    $pdo->prepare('UPDATE admins SET password_hash = :h WHERE id = :id')
        ->execute(['h' => $hash, 'id' => $existingId]);
    echo "Password reset for existing admin \"$username\" (id $existingId) in database " . DB_NAME . ".\n";
} else {
    $email = trim($argv[3] ?? '') ?: $username . '@cajden.local';
    $fullName = trim($argv[4] ?? '') ?: 'System Administrator';
    $taken = $pdo->prepare('SELECT username FROM admins WHERE email = :e');
    $taken->execute(['e' => $email]);
    if ($other = $taken->fetchColumn()) {
        fwrite(STDERR, "Email $email already belongs to admin \"$other\". Pass a different email as the 3rd argument.\n");
        exit(1);
    }
    $pdo->prepare('INSERT INTO admins (username, email, password_hash, full_name) VALUES (:u, :e, :h, :n)')
        ->execute(['u' => $username, 'e' => $email, 'h' => $hash, 'n' => $fullName]);
    echo "Created admin \"$username\" <$email> in database " . DB_NAME . ".\n";
}

if ($generated) {
    echo "Generated password: $password\n";
    echo "Store it in a password manager; it is not saved anywhere else.\n";
}
echo "Change it any time from Admin -> Settings after logging in.";
