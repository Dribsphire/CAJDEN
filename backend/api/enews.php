<?php
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/upload.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && ($_GET['_method'] ?? '') === 'PUT') $method = 'PUT';

const ENEWS_FIELDS = ['issue_number', 'title', 'period_label', 'published_on', 'summary', 'highlights'];

switch ($method) {
    // -----------------------------------------------------
    // GET /api/enews.php        -> all issues, latest issue first
    // GET /api/enews.php?id=4   -> single issue
    // -----------------------------------------------------
    case 'GET':
        if (!empty($_GET['id'])) {
            $stmt = $pdo->prepare('SELECT * FROM enews_issues WHERE id = :id');
            $stmt->execute(['id' => $_GET['id']]);
            $issue = $stmt->fetch();
            if (!$issue) respond(false, ['message' => 'Issue not found.'], 404);
            respond(true, ['issue' => $issue]);
        }
        $issues = $pdo->query('SELECT * FROM enews_issues ORDER BY issue_number DESC, published_on DESC')->fetchAll();
        respond(true, ['issues' => $issues]);
        break;

    // -----------------------------------------------------
    // POST /api/enews.php  (multipart: issue_number, title, period_label,
    //                       published_on, summary, highlights, cover, pdf)
    // -----------------------------------------------------
    case 'POST':
        requireAuth();
        $number = (int) ($_POST['issue_number'] ?? 0);
        $title = sanitize($_POST['title'] ?? '');
        if ($number < 1 || $title === '') {
            respond(false, ['message' => 'Issue number and headline are required.'], 422);
        }
        $cover = handleImageUpload('cover', 'enews');
        $pdf = handleDocumentUpload('pdf', 'enews', ['pdf']);
        $stmt = $pdo->prepare('INSERT INTO enews_issues
            (issue_number, title, period_label, published_on, summary, highlights, cover_image, pdf_path, file_size, created_by)
            VALUES (:issue_number, :title, :period_label, :published_on, :summary, :highlights, :cover, :pdf, :size, :admin_id)');
        $stmt->execute([
            'issue_number' => $number,
            'title' => $title,
            'period_label' => sanitize($_POST['period_label'] ?? '') ?: null,
            'published_on' => sanitize($_POST['published_on'] ?? '') ?: null,
            'summary' => sanitize($_POST['summary'] ?? '') ?: null,
            'highlights' => sanitize($_POST['highlights'] ?? '') ?: null,
            'cover' => $cover,
            'pdf' => $pdf['path'] ?? null,
            'size' => $pdf['size'] ?? null,
            'admin_id' => currentAdminId(),
        ]);
        respond(true, ['message' => 'Issue published.', 'id' => $pdo->lastInsertId()], 201);
        break;

    case 'PUT':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'Issue id required.'], 422);
        $current = $pdo->prepare('SELECT cover_image, pdf_path FROM enews_issues WHERE id = :id');
        $current->execute(['id' => $id]);
        $current = $current->fetch();
        if (!$current) respond(false, ['message' => 'Issue not found.'], 404);

        $data = $_POST ?: jsonInput();
        $fields = []; $params = ['id' => $id];
        foreach (ENEWS_FIELDS as $f) {
            if (array_key_exists($f, $data)) {
                $fields[] = "$f = :$f";
                $value = sanitize($data[$f]);
                $params[$f] = $f === 'issue_number' ? (int) $value : ($value === '' && $f !== 'title' ? null : $value);
            }
        }
        if ((isset($params['title']) && $params['title'] === '') || (isset($params['issue_number']) && $params['issue_number'] < 1)) {
            respond(false, ['message' => 'Issue number and headline are required.'], 422);
        }
        $cover = handleImageUpload('cover', 'enews');
        if ($cover) { $fields[] = 'cover_image = :cover'; $params['cover'] = $cover; }
        $pdf = handleDocumentUpload('pdf', 'enews', ['pdf']);
        if ($pdf) {
            $fields[] = 'pdf_path = :pdf'; $params['pdf'] = $pdf['path'];
            $fields[] = 'file_size = :size'; $params['size'] = $pdf['size'];
        }
        if (empty($fields)) respond(false, ['message' => 'Nothing to update.'], 422);
        $pdo->prepare('UPDATE enews_issues SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        if ($cover) deleteUpload($current['cover_image']);
        if ($pdf) deleteUpload($current['pdf_path']);
        respond(true, ['message' => 'Issue updated.']);
        break;

    case 'DELETE':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        $stmt = $pdo->prepare('SELECT cover_image, pdf_path FROM enews_issues WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $issue = $stmt->fetch();
        if (!$issue) respond(false, ['message' => 'Issue not found.'], 404);
        $pdo->prepare('DELETE FROM enews_issues WHERE id = :id')->execute(['id' => $id]);
        deleteUpload($issue['cover_image']);
        deleteUpload($issue['pdf_path']);
        respond(true, ['message' => 'Issue deleted.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
