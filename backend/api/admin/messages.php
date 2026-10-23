<?php
require_once __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/mailer.php';
requireAuth();

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Reply tracking, added after the first release (see migrations/2026_10_mail.sql).
if (!$pdo->query("SHOW COLUMNS FROM contact_messages LIKE 'replied_at'")->fetch()) {
    $pdo->exec('ALTER TABLE contact_messages ADD COLUMN replied_at DATETIME DEFAULT NULL, ADD COLUMN reply_text TEXT DEFAULT NULL');
}

switch ($method) {
    case 'GET':
        // Lightweight poll used by the admin sidebar badge.
        if (isset($_GET['unread_count'])) {
            $count = (int) $pdo->query('SELECT COUNT(*) FROM contact_messages WHERE is_read = 0')->fetchColumn();
            respond(true, ['unread' => $count]);
        }
        $messages = $pdo->query('SELECT * FROM contact_messages ORDER BY sent_at DESC')->fetchAll();
        respond(true, ['messages' => $messages, 'mail_configured' => (bool) mailConfigured()]);
        break;

    // POST ?id=5&action=reply  { reply }  -> email the sender from the CAJDEN Gmail
    case 'POST':
        if (($_GET['action'] ?? '') !== 'reply') respond(false, ['message' => 'Unknown action.'], 400);
        $id = (int) ($_GET['id'] ?? 0);
        $stmt = $pdo->prepare('SELECT * FROM contact_messages WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $msg = $stmt->fetch();
        if (!$msg) respond(false, ['message' => 'Message not found.'], 404);

        $reply = trim((string) (jsonInput()['reply'] ?? ''));
        if ($reply === '') respond(false, ['message' => 'Write a reply first.'], 422);
        if (mb_strlen($reply) > 10000) respond(false, ['message' => 'The reply is too long.'], 422);

        $plain = fn($v) => html_entity_decode((string) $v, ENT_QUOTES, 'UTF-8');
        $result = sendMail([
            'to' => $plain($msg['email']),
            'reply_to' => [mailFromAddress(), env('MAIL_FROM_NAME', 'CAJDEN Inc.')],
            'subject' => 'Re: ' . $plain($msg['subject']),
            'html' => '<p>Dear ' . e($plain($msg['full_name'])) . ',</p>'
                . '<div>' . nl2br(e($reply)) . '</div>'
                . '<p style="margin-top:28px;font-size:13px;color:#6d6757;border-top:1px solid #EAE1CB;padding-top:12px;">'
                . 'On ' . e(date('F j, Y', strtotime($msg['sent_at']))) . ' you wrote:<br>'
                . '<span style="font-style:italic;">' . nl2br(e($plain($msg['message']))) . '</span></p>',
        ]);
        if (!$result['ok']) respond(false, ['message' => 'Reply not sent: ' . $result['error']], 502);

        $pdo->prepare('UPDATE contact_messages SET replied_at = NOW(), reply_text = :r, is_read = 1 WHERE id = :id')
            ->execute(['r' => $reply, 'id' => $id]);
        respond(true, ['message' => 'Reply sent to ' . $plain($msg['email']) . '.']);
        break;

    case 'PUT': // mark as read/unread
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'Message id required.'], 422);
        $input = jsonInput();
        $isRead = !empty($input['is_read']) ? 1 : 0;
        $pdo->prepare('UPDATE contact_messages SET is_read = :r WHERE id = :id')->execute(['r' => $isRead, 'id' => $id]);
        respond(true, ['message' => 'Message updated.']);
        break;

    case 'DELETE':
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'Message id required.'], 422);
        $pdo->prepare('DELETE FROM contact_messages WHERE id = :id')->execute(['id' => $id]);
        respond(true, ['message' => 'Message deleted.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
