<?php
// =========================================================
// E-News issues. Public visitors see published issues only;
// each one has its own page at /e-news/{issue_number}.
// =========================================================
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/upload.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && ($_GET['_method'] ?? '') === 'PUT') $method = 'PUT';

// Added after the first release; created on demand so existing databases keep
// working (see migrations/2026_10_enews_drafts.sql).
$hasPublished = $pdo->query("SHOW COLUMNS FROM enews_issues LIKE 'is_published'")->fetch();
if (!$hasPublished) $pdo->exec('ALTER TABLE enews_issues ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 1 AFTER file_size');

const ENEWS_TEXT_FIELDS = ['title', 'period_label', 'summary', 'highlights'];

function isOn($value) {
    return !empty($value) && $value !== '0' && $value !== 'false';
}

function validDate($value) {
    $d = DateTime::createFromFormat('!Y-m-d', (string) $value);
    return $d && $d->format('Y-m-d') === $value;
}

function numberTaken(PDO $pdo, $number, $exceptId = 0) {
    $stmt = $pdo->prepare('SELECT id FROM enews_issues WHERE issue_number = :n AND id <> :id LIMIT 1');
    $stmt->execute(['n' => $number, 'id' => $exceptId]);
    return (bool) $stmt->fetchColumn();
}

switch ($method) {
    // -----------------------------------------------------
    // GET /api/enews.php            -> published issues, newest first
    // GET /api/enews.php?all=1      -> every issue incl. drafts (admin)
    // GET /api/enews.php?id=4       -> one issue (drafts: admin only)
    // GET /api/enews.php?number=12  -> one issue by its number (issue page)
    // -----------------------------------------------------
    case 'GET':
        $isAdmin = !empty($_SESSION['admin_id']);
        if (!empty($_GET['id']) || !empty($_GET['number'])) {
            $byId = !empty($_GET['id']);
            $stmt = $pdo->prepare('SELECT * FROM enews_issues WHERE ' . ($byId ? 'id' : 'issue_number') . ' = :v LIMIT 1');
            $stmt->execute(['v' => (int) ($byId ? $_GET['id'] : $_GET['number'])]);
            $issue = $stmt->fetch();
            if (!$issue || (!$issue['is_published'] && !$isAdmin)) respond(false, ['message' => 'Issue not found.'], 404);
            respond(true, ['issue' => $issue]);
        }
        $where = ($isAdmin && !empty($_GET['all'])) ? '' : 'WHERE is_published = 1';
        $issues = $pdo->query("SELECT * FROM enews_issues $where ORDER BY issue_number DESC, published_on DESC")->fetchAll();
        respond(true, ['issues' => $issues]);
        break;

    // -----------------------------------------------------
    // POST /api/enews.php  multipart: issue_number, title, period_label,
    //      published_on, summary, highlights, is_published, cover, pdf
    // -----------------------------------------------------
    case 'POST':
        requireAuth();
        $number = (int) ($_POST['issue_number'] ?? 0);
        $title = sanitize($_POST['title'] ?? '');
        $publishedOn = sanitize($_POST['published_on'] ?? '') ?: date('Y-m-d');
        $isPublished = isOn($_POST['is_published'] ?? '1');
        if ($number < 1 || $title === '') respond(false, ['message' => 'Issue number and cover headline are required.'], 422);
        if (numberTaken($pdo, $number)) respond(false, ['message' => "Issue No. $number already exists."], 422);
        if (!validDate($publishedOn)) respond(false, ['message' => 'Invalid publication date.'], 422);

        $pdf = handleDocumentUpload('pdf', 'enews', ['pdf']);
        if ($isPublished && !$pdf) respond(false, ['message' => 'Attach the newsletter PDF before publishing, or save it as a draft.'], 422);
        $cover = handleImageUpload('cover', 'enews');

        $stmt = $pdo->prepare('INSERT INTO enews_issues
            (issue_number, title, period_label, published_on, summary, highlights, cover_image, pdf_path, file_size, is_published, created_by)
            VALUES (:issue_number, :title, :period_label, :published_on, :summary, :highlights, :cover, :pdf, :size, :pub, :admin_id)');
        $stmt->execute([
            'issue_number' => $number,
            'title' => $title,
            'period_label' => sanitize($_POST['period_label'] ?? '') ?: null,
            'published_on' => $publishedOn,
            'summary' => sanitize($_POST['summary'] ?? '') ?: null,
            'highlights' => sanitize($_POST['highlights'] ?? '') ?: null,
            'cover' => $cover,
            'pdf' => $pdf['path'] ?? null,
            'size' => $pdf['size'] ?? null,
            'pub' => $isPublished ? 1 : 0,
            'admin_id' => currentAdminId(),
        ]);
        respond(true, ['message' => $isPublished ? 'Issue published.' : 'Draft saved.', 'id' => $pdo->lastInsertId()], 201);
        break;

    // PUT (POST + _method=PUT): same fields, plus remove_cover
    case 'PUT':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        $current = $pdo->prepare('SELECT * FROM enews_issues WHERE id = :id');
        $current->execute(['id' => $id]);
        $current = $current->fetch();
        if (!$current) respond(false, ['message' => 'Issue not found.'], 404);

        $data = $_POST ?: jsonInput();
        $fields = []; $params = ['id' => $id];
        foreach (ENEWS_TEXT_FIELDS as $f) {
            if (array_key_exists($f, $data)) {
                $fields[] = "$f = :$f";
                $value = sanitize($data[$f]);
                $params[$f] = ($value === '' && $f !== 'title') ? null : $value;
            }
        }
        if (isset($params['title']) && $params['title'] === '') respond(false, ['message' => 'Cover headline is required.'], 422);
        if (array_key_exists('issue_number', $data)) {
            $number = (int) $data['issue_number'];
            if ($number < 1) respond(false, ['message' => 'Issue number is required.'], 422);
            if (numberTaken($pdo, $number, $id)) respond(false, ['message' => "Issue No. $number already exists."], 422);
            $fields[] = 'issue_number = :issue_number'; $params['issue_number'] = $number;
        }
        if (array_key_exists('published_on', $data)) {
            $date = sanitize($data['published_on']) ?: date('Y-m-d');
            if (!validDate($date)) respond(false, ['message' => 'Invalid publication date.'], 422);
            $fields[] = 'published_on = :published_on'; $params['published_on'] = $date;
        }

        $cover = handleImageUpload('cover', 'enews');
        $removeCover = !$cover && isOn($data['remove_cover'] ?? '');
        if ($cover || $removeCover) { $fields[] = 'cover_image = :cover'; $params['cover'] = $cover ?: null; }
        $pdf = handleDocumentUpload('pdf', 'enews', ['pdf']);
        if ($pdf) {
            $fields[] = 'pdf_path = :pdf'; $params['pdf'] = $pdf['path'];
            $fields[] = 'file_size = :size'; $params['size'] = $pdf['size'];
        }
        if (array_key_exists('is_published', $data)) {
            $publish = isOn($data['is_published']);
            if ($publish && !$pdf && !$current['pdf_path']) {
                respond(false, ['message' => 'Attach the newsletter PDF before publishing, or keep it as a draft.'], 422);
            }
            $fields[] = 'is_published = :pub'; $params['pub'] = $publish ? 1 : 0;
        }
        if (empty($fields)) respond(false, ['message' => 'Nothing to update.'], 422);
        $pdo->prepare('UPDATE enews_issues SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        if ($cover || $removeCover) deleteUpload($current['cover_image']);
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
