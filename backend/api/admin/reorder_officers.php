<?php
require_once __DIR__ . '/../../includes/bootstrap.php';
requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, ['message' => 'Method not allowed.'], 405);
}

$input = jsonInput();
$order = $input['order'] ?? []; // [{id, rank_level, sort_order}, ...]

if (empty($order)) respond(false, ['message' => 'No order data provided.'], 422);

$pdo = getDB();
$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare('UPDATE officers SET rank_level = :rank_level, sort_order = :sort_order WHERE id = :id');
    foreach ($order as $item) {
        $stmt->execute([
            'rank_level' => (int) $item['rank_level'],
            'sort_order' => (int) $item['sort_order'],
            'id' => (int) $item['id'],
        ]);
    }
    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    respond(false, ['message' => 'Failed to reorder officers.'], 500);
}

respond(true, ['message' => 'Hierarchy updated.']);
