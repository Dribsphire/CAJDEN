import { useEffect, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import api from '../api/axios';
import PostCard from '../components/PostCard.jsx';
import './NewsBlog.css';

const TABS = [
  { value: '', label: 'All' },
  { value: 'news', label: 'News' },
  { value: 'blog', label: 'Blog' },
  { value: 'event', label: 'Events' },
];

export default function NewsBlog() {
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [type, debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    api.get('/posts.php', { params: { type: type || undefined, search: debouncedSearch || undefined, page, limit: 6 } })
      .then(res => { setPosts(res.data.posts || []); setPagination(res.data.pagination); })
      .finally(() => setLoading(false));
  }, [type, debouncedSearch, page]);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Updates</span>
          <h1>News, Blog &amp; Events</h1>
          <p>Stories, announcements, and upcoming activities from across Negros Island.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="news-controls">
            <div className="news-tabs">
              {TABS.map(t => (
                <button
                  key={t.value}
                  className={`news-tab ${type === t.value ? 'active' : ''}`}
                  onClick={() => setType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="news-search">
              <FaSearch />
              <input
                type="text"
                placeholder="Search articles…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search news and blog posts"
              />
            </div>
          </div>

          {loading && (
            <div className="post-grid">
              {[1, 2, 3, 4, 5, 6].map(i => <div className="skeleton" style={{ height: 300 }} key={i} />)}
            </div>
          )}

          {!loading && posts.length === 0 && (
            <p style={{ padding: '40px 0' }}>No posts found. Try a different search or filter.</p>
          )}

          {!loading && posts.length > 0 && (
            <div className="post-grid">
              {posts.map(p => <PostCard post={p} key={p.id} />)}
            </div>
          )}

          {pagination && pagination.total_pages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span>Page {pagination.page} of {pagination.total_pages}</span>
              <button disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
