<?php
// =========================================================
// Outgoing email through Gmail SMTP (PHPMailer).
// Settings come from backend/.env (or .env.local):
//   GMAIL_ADDRESS        the Gmail account that sends
//   GMAIL_APP_PASSWORD   a 16-character Google App Password (not the login password)
//   CONTACT_RECEIVER_EMAIL  where contact-form notifications go (defaults to GMAIL_ADDRESS)
//   MAIL_FROM_NAME       sender name shown in inboxes (default "CAJDEN Inc.")
// Gmail allows roughly 500 recipients per day on a regular account.
// =========================================================
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailException;

function mailConfigured() {
    return env('GMAIL_ADDRESS') && env('GMAIL_APP_PASSWORD');
}

function mailFromAddress() {
    return env('GMAIL_ADDRESS');
}

function siteUrl($path = '') {
    return rtrim(env('APP_FRONTEND_URL', 'http://localhost:5173'), '/') . $path;
}

function newMailer() {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = env('GMAIL_ADDRESS');
    // App Passwords are shown with spaces ("abcd efgh ..."); Gmail wants them without.
    $mail->Password = str_replace(' ', '', (string) env('GMAIL_APP_PASSWORD'));
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;
    $mail->Timeout = 20;
    $mail->CharSet = PHPMailer::CHARSET_UTF8;
    $mail->setFrom(env('GMAIL_ADDRESS'), env('MAIL_FROM_NAME', 'CAJDEN Inc.'));
    return $mail;
}

/**
 * Sends one email. Options:
 *   to        string|array of addresses (shown in To)
 *   bcc       array of addresses (hidden recipients)
 *   reply_to  [address, name]
 *   subject, html (body content, wrapped in the CAJDEN template), text (plain version)
 * Returns ['ok' => bool, 'error' => string|null]. Never throws.
 */
function sendMail(array $opts) {
    if (!mailConfigured()) return ['ok' => false, 'error' => 'Email is not set up (GMAIL_ADDRESS / GMAIL_APP_PASSWORD missing).'];
    $mail = null;
    try {
        $mail = newMailer();
        foreach ((array) ($opts['to'] ?? []) as $to) $mail->addAddress($to);
        foreach ((array) ($opts['bcc'] ?? []) as $bcc) $mail->addBCC($bcc);
        if (!empty($opts['reply_to'])) $mail->addReplyTo($opts['reply_to'][0], $opts['reply_to'][1] ?? '');
        $mail->isHTML(true);
        $mail->Subject = $opts['subject'];
        $mail->Body = mailTemplate($opts['subject'], $opts['html'], $opts['footer'] ?? '');
        $mail->AltBody = $opts['text'] ?? trim(html_entity_decode(strip_tags(str_replace(['<br>', '</p>'], "\n", $opts['html']))));
        $mail->send();
        return ['ok' => true, 'error' => null];
    } catch (MailException $e) {
        $error = $mail ? $mail->ErrorInfo : $e->getMessage();
        error_log('Mail error: ' . $error);
        if (stripos($error, 'authenticate') !== false || stripos($error, '535') !== false) {
            $error = 'Gmail rejected the login. Check GMAIL_ADDRESS and create a new App Password.';
        }
        return ['ok' => false, 'error' => $error];
    }
}

function e($text) {
    return htmlspecialchars((string) $text, ENT_QUOTES, 'UTF-8');
}

// Simple table-based layout so it renders in Gmail, Outlook and phone mail apps.
function mailTemplate($title, $content, $footer = '') {
    $site = e(siteUrl('/'));
    $footer = $footer ?: 'Christian Advocates for Justice and Development in Negros, Inc.<br>Bacolod City, Negros Occidental';
    return <<<HTML
<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>{$title}</title></head>
<body style="margin:0;padding:0;background:#F4EEDF;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4EEDF;padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFDF7;border:3px solid #14130F;">
    <tr><td style="height:10px;background:repeating-linear-gradient(90deg,#C8352B 0 10px,#F6C21C 10px 16px,#0F6B3A 16px 24px,#F4EEDF 24px 28px);background-color:#C8352B;font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td style="background:#14130F;padding:18px 24px;">
      <a href="{$site}" style="color:#F6C21C;font-family:'Arial Black',Arial,sans-serif;font-size:22px;letter-spacing:1px;text-decoration:none;">CAJDEN</a>
    </td></tr>
    <tr><td style="padding:28px 24px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#14130F;">
      {$content}
    </td></tr>
    <tr><td style="padding:16px 24px;border-top:2px solid #14130F;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#6d6757;">
      {$footer}
    </td></tr>
  </table>
</td></tr></table>
</body></html>
HTML;
}

// A bold, inked button that works in email clients.
function mailButton($href, $label) {
    return '<p style="margin:24px 0;"><a href="' . e($href) . '" style="display:inline-block;padding:12px 20px;background:#F6C21C;border:3px solid #14130F;color:#14130F;font-family:Arial,sans-serif;font-weight:bold;text-decoration:none;text-transform:uppercase;font-size:14px;">' . e($label) . '</a></p>';
}
