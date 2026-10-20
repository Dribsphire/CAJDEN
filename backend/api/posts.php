<?php
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/upload.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
// Browsers/Axios can't send multipart data on a real PUT request, so the
// frontend sends POST + ?_method=PUT when an image file is attached.
if ($method === 'POST' && ($_GET['_method'] ?? '') === 'PUT') {
    $method = 'PUT';
}

// Accepts "2026-11-14" (date only), "2026-11-14T08:00" or "2026-11-14 08:00:00".
// A date-only value means: today -> right now, any other day -> the start of that day
// (a future day schedules the post, a past day backdates it).
// Returns a MySQL datetime string, null for empty, or false if unparseable.
function parsePublishDate($value) {
    $value = trim((string) $value);
    if ($value === '') return null;
    $day = DateTime::createFromFormat('!Y-m-d', $value);
    if ($day && $day->format('Y-m-d') === $value) {
        return $value === date('Y-m-d') ? date('Y-m-d H:i:s') : $day->format('Y-m-d 00:00:00');
    }
    foreach (['Y-m-d\TH:i', 'Y-m-d\TH:i:s', 'Y-m-d H:i:s', 'Y-m-d H:i'] as $format) {
        $d = DateTime::createFromFormat($format, $value);
        if ($d && $d->format($format) === $value) return $d->format('Y-m-d H:i:s');
    }
    return false;
}

// Public visitors only see published posts whose publish date has arrived.
const PUBLIC_POST = 'status = "published" AND published_at <= NOW()';

function slugify($text) {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = trim($text, '-');
    $text = strtolower($text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    return $text ?: 'post-' . time();
}

switch ($method) {

    // -----------------------------------------------------
    // GET /api/posts.php            -> list (public: published and due)
    // GET /api/posts.php?id=5       -> single post
    // GET /api/posts.php?slug=abc   -> single post by slug (article page)
    // Query params: type=news|blog|event, search=, page=, limit=
    // Drafts and scheduled posts are only returned to a logged-in admin.
    // -----------------------------------------------------
    case 'GET':
        if (!empty($_GET['id']) || !empty($_GET['slug'])) {
            $byId = !empty($_GET['id']);
            $stmt = $pdo->prepare('SELECT *, (' . PUBLIC_POST . ') AS is_public FROM posts WHERE '
                . ($byId ? 'id = :key' : 'slug = :key') . ' LIMIT 1');
            $stmt->execute(['key' => $byId ? (int) $_GET['id'] : (string) $_GET['slug']]);
            $post = $stmt->fetch();
            if (!$post || (!$post['is_public'] && empty($_SESSION['admin_id']))) {
                respond(false, ['message' => 'Post not found.'], 404);
            }
            $post['is_public'] = (bool) $post['is_public'];
            respond(true, ['post' => $post]);
        }

        $page = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(24, max(1, (int) ($_GET['limit'] ?? 6)));
        $offset = ($page - 1) * $limit;

        $isAdmin = !empty($_SESSION['admin_id']);
        $where = [];
        $params = [];

        if ($isAdmin && ($_GET['status'] ?? '') === 'all') {
            // admin dashboard: show everything, including drafts and scheduled posts
        } else {
            $where[] = PUBLIC_POST;
        }

        if (!empty($_GET['type']) && in_array($_GET['type'], ['news', 'blog', 'event'])) {
            $where[] = 'type = :type';
            $params['type'] = $_GET['type'];
        }

        if (!empty($_GET['search'])) {
            $where[] = 'MATCH(title, short_description, content) AGAINST (:search IN NATURAL LANGUAGE MODE)';
            $params['search'] = $_GET['search'];
        }

        $whereSql = empty($where) ? '' : 'WHERE ' . implode(' AND ', $where);

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM posts $whereSql");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $sql = "SELECT id, type, title, slug, category, author, cover_image, short_description, status,
                       event_date, event_venue, published_at
                FROM posts $whereSql
                ORDER BY published_at DESC
                LIMIT :limit OFFSET :offset";
        $stmt = $pdo->prepare($sql);
        foreach ($params as $k => $v) $stmt->bindValue(":$k", $v);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        respond(true, [
            'posts' => $stmt->fetchAll(),
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => (int) ceil($total / $limit),
            ],
        ]);
        break;

    // -----------------------------------------------------
    // POST /api/posts.php  (admin only, multipart/form-data)
    // -----------------------------------------------------
    case 'POST':
        requireAuth();

        $title = sanitize($_POST['title'] ?? '');
        $type = sanitize($_POST['type'] ?? 'news');
        $category = sanitize($_POST['category'] ?? '');
        $author = sanitize($_POST['author'] ?? '');
        $shortDesc = sanitize($_POST['short_description'] ?? '');
        $content = $_POST['content'] ?? ''; // rich content, sanitized on output/render
        $status = in_array($_POST['status'] ?? '', ['published', 'draft']) ? $_POST['status'] : 'published';
        $eventDate = !empty($_POST['event_date']) ? $_POST['event_date'] : null;
        $eventVenue = sanitize($_POST['event_venue'] ?? '');
        $publishedAt = parsePublishDate($_POST['published_at'] ?? '');

        if ($title === '' || $content === '' || !in_array($type, ['news', 'blog', 'event'])) {
            respond(false, ['message' => 'Title, type and content are required.'], 422);
        }
        if ($publishedAt === false) respond(false, ['message' => 'Invalid publish date.'], 422);
        if ($eventDate !== null && parsePublishDate($eventDate) === false) respond(false, ['message' => 'Invalid event date.'], 422);
        $publishedAt = $publishedAt ?? date('Y-m-d H:i:s'); // empty = publish now

        $coverImage = handleImageUpload('cover_image', 'posts');
        $slug = slugify($title) . '-' . substr(bin2hex(random_bytes(3)), 0, 6);

        $stmt = $pdo->prepare('INSERT INTO posts
            (type, title, slug, category, author, cover_image, short_description, content, event_date, event_venue, status, published_at, admin_id)
            VALUES (:type, :title, :slug, :category, :author, :cover_image, :short_description, :content, :event_date, :event_venue, :status, :published_at, :admin_id)');
        $stmt->execute([
            'type' => $type, 'title' => $title, 'slug' => $slug, 'category' => $category,
            'author' => $author, 'cover_image' => $coverImage, 'short_description' => $shortDesc,
            'content' => $content, 'event_date' => $eventDate, 'event_venue' => $eventVenue,
            'status' => $status, 'published_at' => $publishedAt, 'admin_id' => currentAdminId(),
        ]);

        respond(true, ['message' => 'Post created.', 'id' => $pdo->lastInsertId(), 'slug' => $slug], 201);
        break;

    // -----------------------------------------------------
    // PUT /api/posts.php?id=5  (admin only)
    // PHP doesn't parse multipart on PUT natively, so frontend
    // sends POST with _method=PUT override for image updates.
    // -----------------------------------------------------
    case 'PUT':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'Post id required.'], 422);

        $current = $pdo->prepare('SELECT cover_image FROM posts WHERE id = :id');
        $current->execute(['id' => $id]);
        $oldCover = $current->fetchColumn();
        if ($oldCover === false) respond(false, ['message' => 'Post not found.'], 404);

        $data = $_POST ?: jsonInput();
        $fields = [];
        $params = ['id' => $id];

        foreach (['title', 'type', 'category', 'author', 'short_description', 'content', 'status', 'event_date', 'event_venue'] as $f) {
            if (isset($data[$f])) {
                $fields[] = "$f = :$f";
                $params[$f] = $f === 'content' ? $data[$f] : sanitize($data[$f]);
            }
        }
        if (isset($params['title']) && $params['title'] === '') respond(false, ['message' => 'Title is required.'], 422);
        if (isset($params['type']) && !in_array($params['type'], ['news', 'blog', 'event'], true)) respond(false, ['message' => 'Invalid post type.'], 422);
        if (isset($params['status']) && !in_array($params['status'], ['published', 'draft'], true)) respond(false, ['message' => 'Invalid status.'], 422);
        // An empty datetime must be NULL; '' is stored by MySQL as 0000-00-00.
        if (isset($params['event_date'])) {
            $params['event_date'] = parsePublishDate($params['event_date']);
            if ($params['event_date'] === false) respond(false, ['message' => 'Invalid event date.'], 422);
        }
        if (isset($data['published_at'])) {
            $publishedAt = parsePublishDate($data['published_at']);
            if ($publishedAt === false) respond(false, ['message' => 'Invalid publish date.'], 422);
            $fields[] = 'published_at = :published_at';
            $params['published_at'] = $publishedAt ?? date('Y-m-d H:i:s'); // cleared = now
        }

        $coverImage = handleImageUpload('cover_image', 'posts');
        $removeCover = !$coverImage && !empty($data['remove_cover']) && $data['remove_cover'] !== '0';
        if ($coverImage || $removeCover) {
            $fields[] = 'cover_image = :cover_image';
            $params['cover_image'] = $coverImage ?: null;
        }

        if (empty($fields)) respond(false, ['message' => 'Nothing to update.'], 422);

        $sql = 'UPDATE posts SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $pdo->prepare($sql)->execute($params);
        if ($coverImage || $removeCover) deleteUpload($oldCover);

        respond(true, ['message' => 'Post updated.']);
        break;

    // -----------------------------------------------------
    // DELETE /api/posts.php?id=5  (admin only)
    // -----------------------------------------------------
    case 'DELETE':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'Post id required.'], 422);
        $stmt = $pdo->prepare('SELECT cover_image, content FROM posts WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $post = $stmt->fetch();
        if (!$post) respond(false, ['message' => 'Post not found.'], 404);
        $pdo->prepare('DELETE FROM posts WHERE id = :id')->execute(['id' => $id]);
        // Remove the cover and any photos placed inside the article body.
        deleteUpload($post['cover_image']);
        preg_match_all('~src="(uploads/posts/inline/[\w.-]+)"~', (string) $post['content'], $inline);
        foreach ($inline[1] as $path) deleteUpload($path);
        respond(true, ['message' => 'Post deleted.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
