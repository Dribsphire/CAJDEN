<?php
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, ['message' => 'Method not allowed.'], 405);
}

$input = jsonInput();
// Honeypot: a field people never see. Bots fill it; pretend success.
if (!empty($input['website'])) respond(true, ['message' => 'Your message was sent successfully. We will get back to you soon!']);

$fullName = sanitize($input['full_name'] ?? '');
$email = sanitize($input['email'] ?? '');
$subject = sanitize($input['subject'] ?? '');
$message = sanitize($input['message'] ?? '');

if ($fullName === '' || $email === '' || $subject === '' || $message === '') {
    respond(false, ['message' => 'All fields are required.'], 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, ['message' => 'Please enter a valid email address.'], 422);
}
if (mb_strlen($message) > 5000) respond(false, ['message' => 'Please keep the message under 5,000 characters.'], 422);

$pdo = getDB();

// Simple flood guard: at most 5 messages per email address per hour.
$recent = $pdo->prepare('SELECT COUNT(*) FROM contact_messages WHERE email = :e AND sent_at > NOW() - INTERVAL 1 HOUR');
$recent->execute(['e' => $email]);
if ((int) $recent->fetchColumn() >= 5) {
    respond(false, ['message' => 'You have sent several messages already. Please wait a little before sending another.'], 429);
}

$stmt = $pdo->prepare('INSERT INTO contact_messages (full_name, email, subject, message)
    VALUES (:full_name, :email, :subject, :message)');
$stmt->execute(['full_name' => $fullName, 'email' => $email, 'subject' => $subject, 'message' => $message]);
$messageId = $pdo->lastInsertId();

// Stored values are HTML-escaped by sanitize(); decode before re-escaping for email.
$plain = fn($v) => html_entity_decode($v, ENT_QUOTES, 'UTF-8');

// 1) Notify the organization. Replying in Gmail goes straight to the sender.
$notify = sendMail([
    'to' => env('CONTACT_RECEIVER_EMAIL', mailFromAddress()),
    'reply_to' => [$plain($email), $plain($fullName)],
    'subject' => 'New message: ' . $plain($subject),
    'html' => '<p style="margin:0 0 6px;font-family:Courier New,monospace;font-size:12px;color:#C8352B;text-transform:uppercase;">Website contact form</p>'
        . '<h1 style="margin:0 0 18px;font-size:24px;">' . e($plain($subject)) . '</h1>'
        . '<p><strong>From:</strong> ' . e($plain($fullName)) . ' &lt;' . e($plain($email)) . '&gt;</p>'
        . '<div style="margin:16px 0;padding:14px 16px;border-left:6px solid #F6C21C;background:#F4EEDF;">' . nl2br(e($plain($message))) . '</div>'
        . '<p style="font-size:14px;color:#4f4a3e;">Reply to this email to answer them directly, or reply from the admin panel.</p>'
        . mailButton(siteUrl('/admin/messages'), 'Open in admin'),
]);

// 2) Acknowledge the sender so they know it arrived (skipped if email is down, to keep the form fast).
if ($notify['ok']) sendMail([
    'to' => $plain($email),
    'subject' => 'We received your message',
    'html' => '<h1 style="margin:0 0 16px;font-size:24px;">Salamat, ' . e($plain($fullName)) . '!</h1>'
        . '<p>Thank you for reaching out to CAJDEN. We received your message and a member of our team will get back to you soon.</p>'
        . '<p style="font-size:14px;color:#4f4a3e;margin-top:20px;"><strong>Your message</strong> · ' . e($plain($subject)) . '</p>'
        . '<div style="padding:12px 14px;border-left:6px solid #F6C21C;background:#F4EEDF;font-size:14px;">' . nl2br(e($plain($message))) . '</div>',
]);

$pdo->prepare('UPDATE contact_messages SET mail_sent = :sent WHERE id = :id')
    ->execute(['sent' => $notify['ok'] ? 1 : 0, 'id' => $messageId]);

// The message is saved either way, so the visitor always gets a success reply.
respond(true, ['message' => 'Your message was sent successfully. We will get back to you soon!']);
