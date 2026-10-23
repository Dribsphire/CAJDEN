<?php
/*
 * CAJDEN: deployment checker. DELETE THIS FILE FROM THE SERVER WHEN DONE.
 *
 * 1. Upload it into public_html (the same folder as index.php and index.html).
 * 2. Open https://infocajden.org/debug.php?key=__DEBUG_KEY__
 *    Add &mail=1 to also test the Gmail login (sends nothing).
 * 3. Fix anything marked FAIL, then delete debug.php.
 *
 * It never prints passwords (they are only checked). The key changes with every build.
 */

declare(strict_types=1);

if (!hash_equals('__DEBUG_KEY__', (string) ($_GET['key'] ?? ''))) {
    http_response_code(404);
    exit('Not found');
}

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');
ini_set('display_errors', '1');
error_reporting(E_ALL);

$root = __DIR__;
$ok = fn (bool $v): string => $v ? 'OK  ' : 'FAIL';
$warn = fn (bool $v): string => $v ? 'OK  ' : 'WARN';
$line = function (string $s = ''): void { echo $s, "\n"; };
$fails = 0;
$check = function (bool $pass, string $label, string $fix = '') use (&$fails, $ok, $line): void {
    if (!$pass) $fails++;
    $line('   ' . $ok($pass) . ' ' . $label);
    if (!$pass && $fix !== '') $line('        → ' . $fix);
};

$line('CAJDEN deployment check — ' . date('Y-m-d H:i:s') . ' (server time)');
$release = is_file("$root/release.json") ? json_decode((string) file_get_contents("$root/release.json"), true) : null;
$line('Release: ' . ($release ? "{$release['name']} (commit {$release['commit']}, built {$release['built']})" : 'release.json not found'));
$line(str_repeat('=', 72));

/* 1. PHP ----------------------------------------------------------------------------------------- */
$line("\n1. PHP");
$check(version_compare(PHP_VERSION, '8.0.0', '>='), 'version ' . PHP_VERSION . ' (needs 8.0+)', 'hPanel › Advanced › PHP Configuration › choose PHP 8.2 or newer.');
foreach (['pdo_mysql', 'mbstring', 'openssl', 'fileinfo', 'json'] as $ext) {
    $check(extension_loaded($ext), "extension $ext", 'hPanel › PHP Configuration › PHP Extensions › enable it.');
}
$toBytes = function (string $v): int {
    $n = (int) $v; $u = strtolower(substr(trim($v), -1));
    return $u === 'g' ? $n * 1073741824 : ($u === 'm' ? $n * 1048576 : ($u === 'k' ? $n * 1024 : $n));
};
$up = $toBytes((string) ini_get('upload_max_filesize'));
$post = $toBytes((string) ini_get('post_max_size'));
$line('   info upload_max_filesize=' . ini_get('upload_max_filesize') . ' post_max_size=' . ini_get('post_max_size') . ' memory_limit=' . ini_get('memory_limit'));
$line('   ' . $warn($up >= 30 * 1048576 && $post >= 32 * 1048576) . ' uploads up to 30 MB (E-News PDFs and Materials)');
if ($up < 30 * 1048576 || $post < 32 * 1048576) {
    $line('        → hPanel › PHP Configuration › PHP Options: upload_max_filesize 32M, post_max_size 40M.');
}
$line('   info timezone ' . date_default_timezone_get() . ', this folder: ' . $root);

/* 2. Files --------------------------------------------------------------------------------------- */
$line("\n2. Files in public_html");
$required = ['index.html', 'index.php', '.htaccess', 'og-image.jpg', 'api/settings.php', 'api/posts.php', 'api/admin/dashboard.php',
    'includes/bootstrap.php', 'includes/env.php', 'includes/mailer.php', 'includes/upload.php', 'config/db.php',
    'vendor/autoload.php', 'vendor/phpmailer/phpmailer/src/PHPMailer.php', 'uploads/.htaccess'];
foreach ($required as $f) {
    $check(file_exists("$root/$f"), $f, 'Extract site.zip into public_html again (allow overwrite; turn on "Show hidden files" for .htaccess).');
}
$assets = glob("$root/assets/index-*.js") ?: [];
$check(count($assets) > 0, 'assets/ has the built site (' . count($assets) . ' main script' . (count($assets) === 1 ? '' : 's') . ')');
if (count($assets) > 1) $line('   info older release files in assets/ are harmless; delete the old ones if you want to tidy up.');
$index = is_file("$root/index.html") ? (string) file_get_contents("$root/index.html") : '';
$check(str_contains($index, 'share:start'), 'index.html has the link-preview block', 'This index.html is from an older release; extract site.zip again.');

/* 3. Uploads ------------------------------------------------------------------------------------- */
$line("\n3. Upload folders (photos, PDFs)");
$check(is_dir("$root/uploads") && is_writable("$root/uploads"), 'uploads/ is writable', 'File Manager › uploads › Permissions › 755.');
foreach (['posts', 'services', 'officers', 'partners', 'albums', 'enews', 'materials'] as $d) {
    $p = "$root/uploads/$d";
    $files = is_dir($p) ? count(glob("$p/*.*") ?: []) : 0;
    $check(is_dir($p) && is_writable($p), "uploads/$d is writable ($files files)", "Create the folder uploads/$d and set Permissions › 755.");
}

/* 4. Settings (.env) ------------------------------------------------------------------------------ */
$line("\n4. Settings (public_html/.env)");
if (!is_readable("$root/.env")) {
    $check(false, '.env exists', 'Create public_html/.env from env.example.txt (File Manager › Settings › Show hidden files).');
    exit("\nStopped: the remaining checks need .env.\n");
}
$env = []; $seen = [];
foreach (file("$root/.env", FILE_IGNORE_NEW_LINES) ?: [] as $n => $raw) {
    if (preg_match('/^\s*([A-Z_]+)\s*=(.*)$/', $raw, $m)) {
        $env[$m[1]] = trim(trim($m[2]), "\"'");
        $seen[$m[1]][] = $n + 1;
    }
}
foreach (['DB_HOST', 'DB_NAME', 'DB_USER'] as $k) {
    $check(($env[$k] ?? '') !== '', "$k = " . (($env[$k] ?? '') !== '' ? $env[$k] : '(empty)'));
}
$check(($env['DB_PASS'] ?? '') !== '', 'DB_PASS ' . (($env['DB_PASS'] ?? '') !== '' ? 'is filled in (' . strlen($env['DB_PASS']) . ' characters)' : 'is EMPTY'));
$front = $env['APP_FRONTEND_URL'] ?? '';
$host = (string) ($_SERVER['HTTP_HOST'] ?? '');
$check($front !== '' && str_starts_with($front, 'https://'), "APP_FRONTEND_URL = " . ($front ?: '(empty)'), 'Set APP_FRONTEND_URL=https://infocajden.org');
if ($front !== '' && $host !== '' && parse_url($front, PHP_URL_HOST) !== $host) {
    $line("   WARN APP_FRONTEND_URL is not this site ($host); the admin login will fail (CORS).");
}
$pass = str_replace(' ', '', $env['GMAIL_APP_PASSWORD'] ?? '');
$line('   ' . $warn(($env['GMAIL_ADDRESS'] ?? '') !== '') . ' GMAIL_ADDRESS = ' . (($env['GMAIL_ADDRESS'] ?? '') ?: '(empty: emails are not sent)'));
$line('   ' . $warn(strlen($pass) === 16) . ' GMAIL_APP_PASSWORD ' . ($pass === '' ? 'is EMPTY' : 'has ' . strlen($pass) . ' letters (Google App Passwords have 16)'));
foreach ($seen as $k => $lines) {
    if (count($lines) > 1) $line("   WARN $k appears " . count($lines) . ' times (lines ' . implode(', ', $lines) . '); the first one counts. Keep one.');
}
if (is_file("$root/.env.local")) $line('   WARN .env.local is on the server; it is only for local development. Delete it.');

/* 5. Database ------------------------------------------------------------------------------------- */
$line("\n5. Database");
$pdo = null;
try {
    $pdo = new PDO(
        sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $env['DB_HOST'] ?? 'localhost', $env['DB_NAME'] ?? ''),
        $env['DB_USER'] ?? '', $env['DB_PASS'] ?? '',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5],
    );
    $line('   OK   connected (MySQL ' . $pdo->query('SELECT VERSION()')->fetchColumn() . ')');
    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    foreach (['admins', 'settings', 'posts', 'services', 'officers', 'partner_organizations', 'offices', 'contact_messages',
        'photo_albums', 'album_photos', 'enews_issues', 'enews_subscribers', 'materials'] as $t) {
        $n = in_array($t, $tables, true) ? (int) $pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn() : -1;
        $check($n >= 0, "$t: " . ($n < 0 ? 'table missing' : "$n rows"),
            'Run migrations/2026_10_resources.sql in phpMyAdmin › SQL (Photos, E-News and Materials tables).');
    }
    // Columns the API adds on first use; listed so you can see whether that has happened yet.
    $pending = [];
    foreach (['partner_organizations' => 'photo_path', 'services' => 'is_published', 'photo_albums' => 'is_published',
        'enews_issues' => 'emailed_at', 'enews_subscribers' => 'token', 'materials' => 'external_url', 'contact_messages' => 'replied_at'] as $t => $c) {
        if (in_array($t, $tables, true) && !$pdo->query("SHOW COLUMNS FROM `$t` LIKE '$c'")->fetch()) $pending[] = "$t.$c";
    }
    $line('   info ' . ($pending ? 'added automatically the first time that part of the admin is used: ' . implode(', ', $pending) : 'all newer columns are in place'));
    $zero = (int) $pdo->query("SELECT COUNT(*) FROM posts WHERE event_date = '0000-00-00 00:00:00'")->fetchColumn();
    $line('   ' . $warn($zero === 0) . " posts with a broken empty event date: $zero");
    if ($zero) $line("        → phpMyAdmin › SQL: UPDATE posts SET event_date = NULL WHERE event_date = '0000-00-00 00:00:00';");
    $admins = (int) $pdo->query('SELECT COUNT(*) FROM admins')->fetchColumn();
    $check($admins > 0, "$admins admin account" . ($admins === 1 ? '' : 's'), 'Create one: php scripts/seed_admin.php <username> (needs SSH), or ask the developer.');
} catch (Throwable $e) {
    $check(false, 'connect: ' . $e->getMessage(),
        '"Access denied": DB_USER / DB_PASS wrong. "Unknown database": DB_NAME must be the full name (e.g. u123_ngo_db).');
}

/* 6. The API through the web address ------------------------------------------------------------- */
$line("\n6. Through the web address (checks .htaccess and the API)");
$base = 'https://' . ($host ?: 'infocajden.org');
$fetch = function (string $path) use ($base): array {
    $ctx = stream_context_create(['http' => ['ignore_errors' => true, 'timeout' => 10, 'follow_location' => 0, 'header' => "User-Agent: cajden-debug\r\n"]]);
    $body = @file_get_contents($base . $path, false, $ctx);
    $status = 0;
    foreach ($http_response_header ?? [] as $h) {
        if (preg_match('#^HTTP/\S+ (\d+)#', $h, $m)) $status = (int) $m[1];
    }
    return [$status, (string) $body];
};
[$s, $b] = $fetch('/api/settings.php');
if ($s === 0) {
    $check(false, "could not reach $base from the server itself",
        'The server may block requests to its own address. Open these in your browser instead: /api/settings.php should show JSON, /.env and /includes/env.php should show 403.');
    goto email;
}
$check($s === 200 && str_contains($b, '"success":true'), "GET /api/settings.php → $s", 'The API answers but with an error: see section 5 and the error log (section 8).');
[$s, $b] = $fetch('/about');
$check($s === 200 && str_contains($b, 'id="root"'), "GET /about (page reload) → $s", 'The main .htaccess is missing or old; extract site.zip again with hidden files.');
$check(str_contains($b, 'og:title" content="About'), 'link previews: /about has its own og:title', 'index.php is not being used; the .htaccess must say DirectoryIndex index.php.');
foreach (['/.env', '/includes/env.php', '/config/db.php', '/vendor/autoload.php', '/scripts/seed_admin.php'] as $secret) {
    [$s] = $fetch($secret);
    $check(in_array($s, [403, 404], true), "$secret is blocked → $s", 'The main .htaccess (from site.zip) is not active. Extract it again; it is a hidden file.');
}

/* 7. Email ----------------------------------------------------------------------------------------- */
email:
$line("\n7. Email (Gmail)");
if (($_GET['mail'] ?? '') !== '1') {
    $line('   skipped; add &mail=1 to the address to test the Gmail login (nothing is sent)');
} elseif (!is_file("$root/vendor/autoload.php")) {
    $check(false, 'PHPMailer missing (vendor/)');
} else {
    require_once "$root/vendor/autoload.php";
    $smtp = new PHPMailer\PHPMailer\SMTP();
    $smtp->Timeout = 15;
    $loggedIn = $smtp->connect('smtp.gmail.com', 587, 15) && $smtp->hello($host ?: 'localhost') && $smtp->startTLS()
        && $smtp->hello($host ?: 'localhost') && $smtp->authenticate($env['GMAIL_ADDRESS'] ?? '', $pass);
    $err = $smtp->getError();
    $smtp->quit();
    $smtp->close();
    $check($loggedIn, $loggedIn ? 'Gmail accepted the login' : 'Gmail login: ' . trim((string) ($err['detail'] ?: $err['error'])),
        'Create a new App Password at https://myaccount.google.com/apppasswords and paste all 16 letters into GMAIL_APP_PASSWORD.');
}

/* 8. Recent errors --------------------------------------------------------------------------------- */
$line("\n8. Last PHP errors");
$logs = array_filter([ini_get('error_log') ?: null, "$root/error_log", "$root/api/error_log", "$root/api/admin/error_log"], fn ($f) => $f && is_readable($f));
if (!$logs) {
    $line('   none found here (Hostinger also lists errors in hPanel › Advanced › Error logs)');
}
foreach (array_unique($logs) as $log) {
    $tail = array_slice(file($log, FILE_IGNORE_NEW_LINES) ?: [], -5);
    $line('   ' . str_replace($root, '.', $log) . ':');
    foreach ($tail as $l) $line('     ' . mb_substr($l, 0, 300));
}

$line("\n" . str_repeat('=', 72));
$line($fails === 0 ? 'ALL CHECKS PASSED.' : "$fails check" . ($fails === 1 ? '' : 's') . ' FAILED: fix the items marked FAIL above, then reload this page.');
$line('DELETE debug.php FROM THE SERVER NOW THAT YOU ARE DONE.');
