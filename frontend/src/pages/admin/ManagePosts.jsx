import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import api, { assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { formatDate } from '../../utils/format.js';

const PAGE_SIZE = 20;

export default function ManagePosts() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  function load(targetPage = page) {
    setLoading(true);
    api.get('/posts.php', { params: { limit: PAGE_SIZE, page: targetPage, status: 'all' } })
      .then(res => {
        const list = res.data.posts || [];
        const info = res.data.pagination;
        // Deleting the last post on a page leaves it empty; step back one page.
        if (!list.length && targetPage > 1) { setPage(targetPage - 1); return; }
        setPosts(list);
        setPagination(info);
      })
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    await api.delete(`/posts.php?id=${id}`);
    setToast({ type: 'success', message: 'Post deleted.' });
    load();
  }

  return (
    <>
      <div className="admin-page-header">
        <h2>News / Blog / Events</h2>
        <Link to="/admin/posts/new" className="btn btn-primary"><FaPlus /> Add Post</Link>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Cover</th><th>Title</th><th>Type</th><th>Status</th><th>Category</th><th>Author</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8}>Loading…</td></tr>}
            {!loading && posts.length === 0 && <tr><td colSpan={8}>No posts yet. Click "Add Post" to create one.</td></tr>}
            {posts.map(p => (
              <tr key={p.id}>
                <td>{p.cover_image ? <img className="admin-thumb" src={assetUrl(p.cover_image)} alt="" /> : <div className="admin-thumb" />}</td>
                <td><Link to={`/admin/posts/${p.id}`} className="admin-row-link">{p.title}</Link></td>
                <td><span className="badge">{p.type}</span></td>
                <td>
                  {p.status === 'draft'
                    ? <span className="badge admin-badge-draft">Draft</span>
                    : new Date(String(p.published_at).replace(' ', 'T')) > new Date() // live at that day's start
                      ? <span className="badge admin-badge-scheduled">Scheduled</span>
                      : 'Published'}
                </td>
                <td>{p.category || '—'}</td>
                <td>{p.author || '—'}</td>
                <td>{formatDate(p.published_at)}</td>
                <td>
                  <Link to={`/admin/posts/${p.id}`} className="icon-btn" aria-label="Edit"><FaEdit /></Link>
                  <button className="icon-btn danger" onClick={() => handleDelete(p.id)} aria-label="Delete"><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total_pages > 1 && (
        <nav className="admin-pager" aria-label="Posts pages">
          <button className="btn btn-outline btn-sm" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {pagination.page} of {pagination.total_pages} · {pagination.total} posts</span>
          <button className="btn btn-outline btn-sm" disabled={page >= pagination.total_pages || loading} onClick={() => setPage(p => p + 1)}>Next</button>
        </nav>
      )}

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
