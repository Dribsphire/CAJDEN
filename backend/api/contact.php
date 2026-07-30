<?php
require_once __DIR__ . '/../includes/bootstrap.php';

// PHPMailer (install via: composer require phpmailer/phpmailer)
require_once __DIR__ . '/../vendor/autoload.php';
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, ['message' => 'Method not allowed.'], 405);
}

$input = jsonInput();
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

$pdo = getDB();
$stmt = $pdo->prepare('INSERT INTO contact_messages (full_name, email, subject, message)
    VALUES (:full_name, :email, :subject, :message)');
$stmt->execute(['full_name' => $fullName, 'email' => $email, 'subject' => $subject, 'message' => $message]);
$messageId = $pdo->lastInsertId();

// ---- Send email notification to the org's Gmail via PHPMailer ----
$mailSent = false;
try {
    $gmailAddress = env('GMAIL_ADDRESS');
    $gmailAppPassword = env('GMAIL_APP_PASSWORD');
    $receiver = env('CONTACT_RECEIVER_EMAIL', $gmailAddress);

    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = $gmailAddress;
    $mail->Password = $gmailAppPassword; // Gmail App Password, not the login password
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    $mail->setFrom($gmailAddress, 'NGO Website');
    $mail->addAddress($receiver, 'NGO Inbox');
    $mail->addReplyTo($email, $fullName);

    $mail->isHTML(true);
    $mail->Subject = "New Contact Message: $subject";
    $mail->Body = "
        <h3>New message from the website contact form</h3>
        <p><strong>Name:</strong> " . htmlspecialchars($fullName) . "</p>
        <p><strong>Email:</strong> " . htmlspecialchars($email) . "</p>
        <p><strong>Subject:</strong> " . htmlspecialchars($subject) . "</p>
        <p><strong>Message:</strong><br>" . nl2br(htmlspecialchars($message)) . "</p>
    ";
    $mail->AltBody = "$fullName ($email)\nSubject: $subject\n\n$message";

    $mail->send();
    $mailSent = true;
} catch (Exception $e) {
    // Message is already saved in DB even if email fails; log for admin follow-up.
    error_log('PHPMailer error: ' . $mail->ErrorInfo);
}

$pdo->prepare('UPDATE contact_messages SET mail_sent = :sent WHERE id = :id')
    ->execute(['sent' => $mailSent ? 1 : 0, 'id' => $messageId]);

respond(true, [
    'message' => $mailSent
        ? 'Your message was sent successfully. We will get back to you soon!'
        : 'Your message was saved, but the email notification could not be sent. We will still follow up.',
]);
