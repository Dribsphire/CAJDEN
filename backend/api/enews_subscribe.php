<?php
// =========================================================
// E-News mailing list.
//   POST   (public)  { email }      -> subscribe
//   GET    (admin)                  -> list subscribers
//   DELETE (admin)  ?id=            -> remove a subscriber
// =========================================================
require_once __DIR__ . '/../includes/bootstrap.php';

$pdo = getDB();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'POST':
        $email = strtolower(sanitize(jsonInput()['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) {
            respond(false, ['message' => 'Please enter a valid email address.'], 422);
        }
        // Re-subscribing an existing address is treated as success, so the
        // form never reveals whether an email is already on the list.
        $pdo->prepare('INSERT IGNORE INTO enews_subscribers (email) VALUES (:email)')->execute(['email' => $email]);
        respond(true, ['message' => "Salamat! You'll get the next issue in your inbox."]);
        break;

    case 'GET':
        requireAuth();
        $subscribers = $pdo->query('SELECT id, email, subscribed_at FROM enews_subscribers ORDER BY subscribed_at DESC')->fetchAll();
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
