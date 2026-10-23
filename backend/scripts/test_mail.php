<?php
// =========================================================
// Email setup check from the command line.
//   php backend/scripts/test_mail.php            -> log in to Gmail only, send nothing
//   php backend/scripts/test_mail.php you@x.com  -> also send a test email there
// Uses the same settings as the API (backend/.env, plus .env.local when present).
// =========================================================
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once __DIR__ . '/../includes/env.php';
loadAppEnv();
require_once __DIR__ . '/../includes/mailer.php';

if (!mailConfigured()) {
    fwrite(STDERR, "GMAIL_ADDRESS / GMAIL_APP_PASSWORD are not set in backend/.env or backend/.env.local.\n");
    exit(1);
}

echo 'Account: ' . mailFromAddress() . "\n";
$smtp = new PHPMailer\PHPMailer\SMTP();
$smtp->Timeout = 15;
$ok = $smtp->connect('smtp.gmail.com', 587, 15) && $smtp->hello('localhost') && $smtp->startTLS()
    && $smtp->hello('localhost') && $smtp->authenticate(mailFromAddress(), str_replace(' ', '', (string) env('GMAIL_APP_PASSWORD')));
$error = $smtp->getError();
$smtp->quit();
$smtp->close();
if (!$ok) {
    echo "Login FAILED: " . trim($error['detail'] ?: $error['error']) . "\n";
    echo "Create a new App Password at https://myaccount.google.com/apppasswords (2-Step Verification must be on)\n";
    echo "and put it in GMAIL_APP_PASSWORD.\n";
    exit(1);
}
echo "Login OK.\n";

$to = $argv[1] ?? null;
if ($to) {
    $result = sendMail([
        'to' => $to,
        'subject' => 'CAJDEN website: test email',
        'html' => '<h1 style="margin:0 0 16px;font-size:24px;">Email is working.</h1><p>Sent from the command line at ' . e(date('F j, Y g:i A')) . '.</p>',
    ]);
    echo $result['ok'] ? "Test email sent to $to.\n" : 'Sending FAILED: ' . $result['error'] . "\n";
    exit($result['ok'] ? 0 : 1);
}
