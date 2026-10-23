<?php
// =========================================================
// Admin — check the email setup.
//   GET   -> { configured, from }       (no email sent)
//   POST  { to? } -> sends a test email (defaults to the Gmail account itself)
// =========================================================
require_once __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/mailer.php';
requireAuth();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    respond(true, ['configured' => (bool) mailConfigured(), 'from' => mailFromAddress()]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(false, ['message' => 'Method not allowed.'], 405);

$to = trim((string) (jsonInput()['to'] ?? '')) ?: mailFromAddress();
if (!filter_var($to, FILTER_VALIDATE_EMAIL)) respond(false, ['message' => 'Enter a valid email address.'], 422);

$result = sendMail([
    'to' => $to,
    'subject' => 'CAJDEN website: test email',
    'html' => '<h1 style="margin:0 0 16px;font-size:24px;">Email is working.</h1>'
        . '<p>This test was sent from the CAJDEN admin panel at ' . e(date('F j, Y g:i A')) . '.</p>'
        . '<p>Contact-form notifications, replies to messages, E-News welcome emails and issue mailings will all be sent from <strong>' . e(mailFromAddress()) . '</strong>.</p>',
]);
if (!$result['ok']) respond(false, ['message' => $result['error']], 502);
respond(true, ['message' => "Test email sent to $to. Check the inbox (and the spam folder)."]);
