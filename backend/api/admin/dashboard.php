<?php
require_once __DIR__ . '/../../includes/bootstrap.php';
requireAuth();

$pdo = getDB();

$counts = [
    'total_news' => $pdo->query("SELECT COUNT(*) FROM posts WHERE type='news'")->fetchColumn(),
    'total_blogs' => $pdo->query("SELECT COUNT(*) FROM posts WHERE type='blog'")->fetchColumn(),
    'total_events' => $pdo->query("SELECT COUNT(*) FROM posts WHERE type='event'")->fetchColumn(),
    'total_offices' => $pdo->query("SELECT COUNT(*) FROM offices")->fetchColumn(),
    'total_services' => $pdo->query("SELECT COUNT(*) FROM services")->fetchColumn(),
    'total_messages' => $pdo->query("SELECT COUNT(*) FROM contact_messages")->fetchColumn(),
    'unread_messages' => $pdo->query("SELECT COUNT(*) FROM contact_messages WHERE is_read = 0")->fetchColumn(),
    'total_officers' => $pdo->query("SELECT COUNT(*) FROM officers")->fetchColumn(),
];

$recentMessages = $pdo->query('SELECT id, full_name, subject, sent_at, is_read FROM contact_messages ORDER BY sent_at DESC LIMIT 5')->fetchAll();
$recentPosts = $pdo->query('SELECT id, type, title, published_at FROM posts ORDER BY published_at DESC LIMIT 5')->fetchAll();

respond(true, ['counts' => $counts, 'recent_messages' => $recentMessages, 'recent_posts' => $recentPosts]);
