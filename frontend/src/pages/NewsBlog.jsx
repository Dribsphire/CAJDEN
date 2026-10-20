import { useEffect, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import api from '../api/axios';
import PostCard from '../components/PostCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
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
    api.get('/posts.php', { params: { type: type || undefined, search: debouncedSearch || undefined, page, limit: 9 } })
      .then(res => { setPosts(res.data.posts || []); setPagination(res.data.pagination); })
      .catch(() => { setPosts([]); setPagination(null); })
      .finally(() => setLoading(false));
  }, [type, debouncedSearch, page]);

  return (
    <>
      <PageHeader
        title="News"
        lede="Stories, announcements, and upcoming activities from across Negros Island."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'News, blog & events' }]}
      />

      <section className="section">
        <div className="container">
          <div className="news-controls">
            <div className="chips" role="group" aria-label="Filter by type">
              {TABS.map(t => (
                <button
                  key={t.value}
                  className={`chip ${type === t.value ? 'active' : ''}`}
                  onClick={() => setType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <label className="search-field">
              <FaSearch aria-hidden="true" />
              <span className="sr-only">Search news and blog posts</span>
              <input
                type="search"
                placeholder="Search articles…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </label>
          </div>

          {loading && (
            <div className="post-grid">
              {[1, 2, 3].map(i => <div className="skeleton" style={{ height: 380 }} key={i} />)}
            </div>
          )}

          {!loading && posts.length === 0 && (
            <p className="empty-note">No posts found. Try a different search or filter.</p>
          )}

          {!loading && posts.length > 0 && (
            <div className="post-grid">
              {posts.map(p => <PostCard post={p} key={p.id} />)}
            </div>
          )}

          {pagination && pagination.total_pages > 1 && (
            <nav className="pagination" aria-label="Pagination">
              <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span className="mono">Page {pagination.page} of {pagination.total_pages}</span>
              <button className="btn btn-sm" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next</button>
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
