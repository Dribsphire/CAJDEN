<?php
require_once __DIR__ . '/../../includes/bootstrap.php';
requireAuth();

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $messages = $pdo->query('SELECT * FROM contact_messages ORDER BY sent_at DESC')->fetchAll();
        respond(true, ['messages' => $messages]);
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
