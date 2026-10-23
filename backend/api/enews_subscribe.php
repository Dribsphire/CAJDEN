<?php
// =========================================================
// E-News mailing list.
//   POST   (public)  { email, website }        -> subscribe + welcome email ("website" is a honeypot)
//   POST   (public)  ?action=unsubscribe { token } -> remove the address that owns the token
//   GET    (admin)                             -> list subscribers
//   GET    (admin)   ?format=csv               -> download as CSV
//   DELETE (admin)   ?id=                      -> remove a subscriber
// =========================================================
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/mailer.php';

$pdo = getDB();
$thanks = "Salamat! Check your inbox for a welcome email. You'll get the next issue there.";

// Every subscriber gets a random token for their one-click unsubscribe link.
// Added after the first release; created on demand (see migrations/2026_10_mail.sql).
if (!$pdo->query("SHOW COLUMNS FROM enews_subscribers LIKE 'token'")->fetch()) {
    $pdo->exec('ALTER TABLE enews_subscribers ADD COLUMN token CHAR(32) DEFAULT NULL, ADD UNIQUE KEY uq_enews_token (token)');
}
$pdo->exec('UPDATE enews_subscribers SET token = MD5(CONCAT(id, email, RAND(), NOW())) WHERE token IS NULL');

function unsubscribeUrl($token) {
    return siteUrl('/e-news/unsubscribe?token=' . urlencode($token));
}

switch ($_SERVER['REQUEST_METHOD']) {
    case 'POST':
        $input = jsonInput();

        if (($_GET['action'] ?? '') === 'unsubscribe') {
            $token = preg_replace('/[^a-f0-9]/', '', (string) ($input['token'] ?? ''));
            if (strlen($token) !== 32) respond(false, ['message' => 'That unsubscribe link is not valid.'], 422);
            $stmt = $pdo->prepare('SELECT email FROM enews_subscribers WHERE token = :t');
            $stmt->execute(['t' => $token]);
            $email = $stmt->fetchColumn();
            // Same answer whether or not the token exists, so links can't be probed.
            if ($email) $pdo->prepare('DELETE FROM enews_subscribers WHERE token = :t')->execute(['t' => $token]);
            respond(true, ['message' => 'You have been unsubscribed. You will not receive any more issues.', 'email' => $email ?: null]);
        }

        // Bots fill every field; people never see this one. Pretend it worked.
        if (!empty($input['website'])) respond(true, ['message' => $thanks]);

        $email = strtolower(sanitize($input['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) {
            respond(false, ['message' => 'Please enter a valid email address.'], 422);
        }
        $token = bin2hex(random_bytes(16));
        $insert = $pdo->prepare('INSERT IGNORE INTO enews_subscribers (email, token) VALUES (:email, :token)');
        $insert->execute(['email' => $email, 'token' => $token]);

        // Only new subscribers get the welcome email. Re-subscribing is treated as
        // success either way, so the form never reveals who is already on the list.
        if ($insert->rowCount() === 1) {
            sendMail([
                'to' => $email,
                'subject' => 'Welcome to CAJDEN E-News',
                'html' => '<h1 style="margin:0 0 16px;font-size:26px;">Salamat for subscribing!</h1>'
                    . '<p>You will receive each new issue of <strong>CAJDEN E-News</strong>: stories from our communities, our programs, and the people behind them.</p>'
                    . mailButton(siteUrl('/e-news'), 'Read the latest issue'),
                'footer' => 'You subscribed on the CAJDEN website. <a href="' . e(unsubscribeUrl($token)) . '" style="color:#6d6757;">Unsubscribe</a> any time.',
            ]);
        }
        respond(true, ['message' => $thanks]);
        break;

    case 'GET':
        requireAuth();
        $subscribers = $pdo->query('SELECT id, email, subscribed_at FROM enews_subscribers ORDER BY subscribed_at DESC')->fetchAll();
        if (($_GET['format'] ?? '') === 'csv') {
            header('Content-Type: text/csv; charset=UTF-8');
            header('Content-Disposition: attachment; filename="cajden-enews-subscribers-' . date('Y-m-d') . '.csv"');
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM so Excel reads UTF-8 correctly
            fputcsv($out, ['Email', 'Subscribed']);
            foreach ($subscribers as $s) fputcsv($out, [$s['email'], $s['subscribed_at']]);
            fclose($out);
            exit;
        }
        respond(true, ['subscribers' => $subscribers]);
        break;

    case 'DELETE':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        $pdo->prepare('DELETE FROM enews_subscribers WHERE id = :id')->execute(['id' => $id]);
        respond(true, ['message' => 'Subscriber removed.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
