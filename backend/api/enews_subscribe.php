<?php
// =========================================================
// E-News mailing list.
//   POST   (public)  { email, website }  -> subscribe ("website" is a honeypot)
//   GET    (admin)                       -> list subscribers
//   GET    (admin)   ?format=csv         -> download as CSV
//   DELETE (admin)   ?id=                -> remove a subscriber
// =========================================================
require_once __DIR__ . '/../includes/bootstrap.php';

$pdo = getDB();
$thanks = "Salamat! You'll get the next issue in your inbox.";

switch ($_SERVER['REQUEST_METHOD']) {
    case 'POST':
        $input = jsonInput();
        // Bots fill every field; people never see this one. Pretend it worked.
        if (!empty($input['website'])) respond(true, ['message' => $thanks]);

        $email = strtolower(sanitize($input['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) {
            respond(false, ['message' => 'Please enter a valid email address.'], 422);
        }
        // Re-subscribing an existing address is treated as success, so the
        // form never reveals whether an email is already on the list.
        $pdo->prepare('INSERT IGNORE INTO enews_subscribers (email) VALUES (:email)')->execute(['email' => $email]);
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
