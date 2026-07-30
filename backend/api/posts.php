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

function slugify($text) {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = trim($text, '-');
    $text = strtolower($text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    return $text ?: 'post-' . time();
}

switch ($method) {

    // -----------------------------------------------------
    // GET /api/posts.php            -> list (public, published only)
    // GET /api/posts.php?id=5       -> single post
    // Query params: type=news|blog|event, search=, page=, limit=
    // -----------------------------------------------------
    case 'GET':
        if (!empty($_GET['id'])) {
            $stmt = $pdo->prepare('SELECT * FROM posts WHERE id = :id LIMIT 1');
            $stmt->execute(['id' => $_GET['id']]);
            $post = $stmt->fetch();
            if (!$post) respond(false, ['message' => 'Post not found.'], 404);
            respond(true, ['post' => $post]);
        }

        $page = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(24, max(1, (int) ($_GET['limit'] ?? 6)));
        $offset = ($page - 1) * $limit;

        $isAdmin = !empty($_SESSION['admin_id']);
        $where = [];
        $params = [];

        if ($isAdmin && ($_GET['status'] ?? '') === 'all') {
            // admin dashboard: show everything, published or draft
        } else {
            $where[] = 'status = "published"';
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

        $sql = "SELECT id, type, title, slug, category, author, cover_image, short_description,
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

        if ($title === '' || $content === '' || !in_array($type, ['news', 'blog', 'event'])) {
            respond(false, ['message' => 'Title, type and content are required.'], 422);
        }

        $coverImage = handleImageUpload('cover_image', 'posts');
        $slug = slugify($title) . '-' . substr(bin2hex(random_bytes(3)), 0, 6);

        $stmt = $pdo->prepare('INSERT INTO posts
            (type, title, slug, category, author, cover_image, short_description, content, event_date, event_venue, status, admin_id)
            VALUES (:type, :title, :slug, :category, :author, :cover_image, :short_description, :content, :event_date, :event_venue, :status, :admin_id)');
        $stmt->execute([
            'type' => $type, 'title' => $title, 'slug' => $slug, 'category' => $category,
            'author' => $author, 'cover_image' => $coverImage, 'short_description' => $shortDesc,
            'content' => $content, 'event_date' => $eventDate, 'event_venue' => $eventVenue,
            'status' => $status, 'admin_id' => currentAdminId(),
        ]);

        respond(true, ['message' => 'Post created.', 'id' => $pdo->lastInsertId()], 201);
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

        $data = $_POST ?: jsonInput();
        $fields = [];
        $params = ['id' => $id];

        foreach (['title', 'type', 'category', 'author', 'short_description', 'content', 'status', 'event_date', 'event_venue'] as $f) {
            if (isset($data[$f])) {
                $fields[] = "$f = :$f";
                $params[$f] = $f === 'content' ? $data[$f] : sanitize($data[$f]);
            }
        }

        $coverImage = handleImageUpload('cover_image', 'posts');
        if ($coverImage) {
            $fields[] = 'cover_image = :cover_image';
            $params['cover_image'] = $coverImage;
        }

        if (empty($fields)) respond(false, ['message' => 'Nothing to update.'], 422);

        $sql = 'UPDATE posts SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $pdo->prepare($sql)->execute($params);

        respond(true, ['message' => 'Post updated.']);
        break;

    // -----------------------------------------------------
    // DELETE /api/posts.php?id=5  (admin only)
    // -----------------------------------------------------
    case 'DELETE':
        requireAuth();
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) respond(false, ['message' => 'Post id required.'], 422);
        $pdo->prepare('DELETE FROM posts WHERE id = :id')->execute(['id' => $id]);
        respond(true, ['message' => 'Post deleted.']);
        break;

    default:
        respond(false, ['message' => 'Method not allowed.'], 405);
}
