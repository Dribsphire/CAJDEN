<?php
// =========================================================
// Serves the React app with link-preview tags for the page being opened.
//
// Facebook, Messenger, Viber, X and search engines read <meta property="og:*">
// tags without running JavaScript, so a shared /news-blog/some-story link would
// otherwise always show the generic site card. This script fills the
// <!-- share:start --> … <!-- share:end --> block of index.html with the
// story's own title, summary and cover photo, then sends the page as usual.
//
// Lives in the web root next to index.html (see .htaccess). If anything here
// fails, the unmodified index.html is sent, so the site never breaks.
// =========================================================

$indexFile = __DIR__ . '/index.html';
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-cache');

try {
    $html = file_get_contents($indexFile);
    $meta = shareMetaFor(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
    $html = preg_replace('~<!-- share:start.*?<!-- share:end -->~s', shareTags($meta), $html, 1);
    echo $html;
} catch (Throwable $e) {
    error_log('Share tags: ' . $e->getMessage());
    readfile($indexFile);
}

// ---------------------------------------------------------

function siteBase() {
    static $base = null;
    if ($base === null) {
        require_once __DIR__ . '/includes/env.php';
        loadAppEnv();
        $base = rtrim(env('APP_FRONTEND_URL', 'https://infocajden.org'), '/');
    }
    return $base;
}

function db() {
    static $pdo = null;
    if ($pdo === null) {
        siteBase(); // loads .env
        $pdo = new PDO(
            'mysql:host=' . env('DB_HOST', 'localhost') . ';dbname=' . trim(env('DB_NAME', 'ngo_db')) . ';charset=utf8mb4',
            trim(env('DB_USER', 'root')), env('DB_PASS', ''),
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_TIMEOUT => 3]
        );
    }
    return $pdo;
}

function one($sql, $params) {
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetch() ?: null;
}

// Stored text is HTML-escaped by the API; decode, strip tags, collapse spaces, shorten.
function clean($text, $max = 200) {
    $text = trim(preg_replace('/\s+/', ' ', strip_tags(html_entity_decode((string) $text, ENT_QUOTES, 'UTF-8'))));
    return mb_strlen($text) > $max ? rtrim(mb_substr($text, 0, $max - 1)) . '…' : $text;
}

function upload($path) {
    return $path ? siteBase() . '/' . ltrim($path, '/') : null;
}

function shareMetaFor($path) {
    $site = 'CAJDEN Inc.';
    $default = [
        'title' => 'CAJDEN Inc. — Christian Advocates for Justice and Development in Negros',
        'description' => 'Empowering Negrosanon communities through education, health, and livelihood programs.',
        'image' => siteBase() . '/og-image.jpg',
        'image_size' => [1200, 630],
        'image_alt' => 'CAJDEN: Lasting change begins in the community.',
        'type' => 'website',
        'url' => siteBase() . ($path === '/' ? '/' : rtrim($path, '/')),
    ];
    $page = fn($title, $description) => array_merge($default, ['title' => "$title · $site", 'description' => $description]);

    // News, blog and event articles
    if (preg_match('~^/news-blog/([^/]+)$~', $path, $m)) {
        $post = one('SELECT title, short_description, content, cover_image, type FROM posts
            WHERE slug = :s AND status = "published" AND published_at <= NOW()', ['s' => urldecode($m[1])]);
        if ($post) {
            return array_merge($default, [
                'title' => clean($post['title'], 120),
                'description' => clean($post['short_description'] ?: $post['content']),
                'image' => upload($post['cover_image']) ?: $default['image'],
                'image_size' => $post['cover_image'] ? null : $default['image_size'],
                'image_alt' => clean($post['title'], 120),
                'type' => 'article',
            ]);
        }
    }

    // E-News issues (and their reader page)
    if (preg_match('~^/e-news/(\d+)(/read)?$~', $path, $m)) {
        $issue = one('SELECT issue_number, title, summary, cover_image FROM enews_issues
            WHERE issue_number = :n AND is_published = 1', ['n' => (int) $m[1]]);
        if ($issue) {
            $no = 'No.' . str_pad($issue['issue_number'], 2, '0', STR_PAD_LEFT);
            return array_merge($default, [
                'title' => "CAJDEN E-News $no: " . clean($issue['title'], 100),
                'description' => clean($issue['summary']) ?: 'Read this issue of CAJDEN E-News, our newsletter from the communities we serve.',
                'image' => upload($issue['cover_image']) ?: $default['image'],
                'image_size' => $issue['cover_image'] ? null : $default['image_size'],
                'image_alt' => "Cover of CAJDEN E-News $no",
                'type' => 'article',
            ]);
        }
    }

    // Photo albums
    if (preg_match('~^/photos/(\d+)$~', $path, $m)) {
        $album = one('SELECT a.title, a.description,
                (SELECT p.image_path FROM album_photos p WHERE p.album_id = a.id ORDER BY p.sort_order, p.id LIMIT 1) AS cover,
                (SELECT COUNT(*) FROM album_photos p WHERE p.album_id = a.id) AS photos
            FROM photo_albums a WHERE a.id = :id AND a.is_published = 1', ['id' => (int) $m[1]]);
        if ($album) {
            return array_merge($default, [
                'title' => clean($album['title'], 110) . " · $site",
                'description' => clean($album['description']) ?: $album['photos'] . ' photos from CAJDEN\'s work in the community.',
                'image' => upload($album['cover']) ?: $default['image'],
                'image_size' => $album['cover'] ? null : $default['image_size'],
                'image_alt' => clean($album['title'], 120),
            ]);
        }
    }

    switch (rtrim($path, '/')) {
        case '/about': return $page('About', 'Our story, mission and vision, and the officers, staff and partner FBPOs behind CAJDEN.');
        case '/services': return $page('Programs', 'Programs built with, and for, the communities we serve: children, youth, families, and parishes across Negros.');
        case '/news-blog': return $page('News, blog & events', 'Stories, announcements, and upcoming activities from across Negros Island.');
        case '/photos': return $page('Photos', 'Albums from our programs, assemblies, and field visits across Negros Occidental.');
        case '/e-news': return $page('E-News', 'Our newsletter: what happened in our communities this season, in our own words.');
        case '/materials': return $page('Materials', 'Training modules, reports, and IEC materials, free for parishes, schools, and partner organizations to use.');
        case '/contact': return $page('Contact', 'Questions, volunteering, partnerships or requests for assistance: get in touch with CAJDEN.');
    }
    return $default;
}

function shareTags($m) {
    $a = fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    $tags = [
        '<!-- share:start -->',
        '<title>' . $a($m['title']) . '</title>',
        '<meta name="description" content="' . $a($m['description']) . '" />',
        '<meta property="og:site_name" content="CAJDEN Inc." />',
        '<meta property="og:type" content="' . $a($m['type']) . '" />',
        '<meta property="og:title" content="' . $a($m['title']) . '" />',
        '<meta property="og:description" content="' . $a($m['description']) . '" />',
        '<meta property="og:url" content="' . $a($m['url']) . '" />',
        '<link rel="canonical" href="' . $a($m['url']) . '" />',
        '<meta property="og:image" content="' . $a($m['image']) . '" />',
    ];
    if (!empty($m['image_size'])) {
        $tags[] = '<meta property="og:image:width" content="' . (int) $m['image_size'][0] . '" />';
        $tags[] = '<meta property="og:image:height" content="' . (int) $m['image_size'][1] . '" />';
    }
    $tags[] = '<meta property="og:image:alt" content="' . $a($m['image_alt']) . '" />';
    $tags[] = '<meta name="twitter:card" content="summary_large_image" />';
    $tags[] = '<!-- share:end -->';
    return implode("\n    ", $tags);
}
