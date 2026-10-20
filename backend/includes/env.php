<?php
// =========================================================
// Minimal .env loader (no external dependency needed).
// Parses KEY=VALUE lines from backend/.env into $_ENV, so
// config files can read secrets without hardcoding them or
// committing them to version control.
// =========================================================

function loadEnv($path) {
    if (!file_exists($path)) {
        return; // silently skip — env() will fall back to defaults
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        if (strpos($line, '=') === false) continue;

        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);

        // strip surrounding quotes if present, e.g. KEY="some value"
        $len = strlen($value);
        if ($len >= 2 && (
            ($value[0] === '"' && $value[$len - 1] === '"') ||
            ($value[0] === "'" && $value[$len - 1] === "'")
        )) {
            $value = substr($value, 1, -1);
        }

        if (!array_key_exists($key, $_ENV)) {
            $_ENV[$key] = $value;
            putenv($key . '=' . $value);
        }
    }
}

// Load backend/.env, preceded by backend/.env.local when the request is
// served from localhost. loadEnv() never overwrites a key that is already
// set, so .env.local wins locally while production only ever reads .env —
// even if .env.local is accidentally uploaded with the rest of the folder.
function loadAppEnv() {
    $host = $_SERVER['SERVER_NAME'] ?? '';
    if (PHP_SAPI === 'cli' || in_array($host, ['localhost', '127.0.0.1'], true)) {
        loadEnv(__DIR__ . '/../.env.local');
    }
    loadEnv(__DIR__ . '/../.env');
}

// Read an env var with a fallback default, e.g. env('DB_HOST', 'localhost')
function env($key, $default = null) {
    if (array_key_exists($key, $_ENV)) {
        return $_ENV[$key];
    }
    $value = getenv($key);
    return $value !== false ? $value : $default;
}
