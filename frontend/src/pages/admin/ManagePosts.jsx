import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import api, { assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';

const EMPTY = {
  id: null, type: 'news', title: '', category: '', author: '',
  short_description: '', content: '', status: 'published',
  event_date: '', event_venue: '', cover_image: null,
};

export default function ManagePosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  function load() {
    setLoading(true);
    api.get('/posts.php', { params: { limit: 24, status: 'all' } })
      .then(res => setPosts(res.data.posts || []))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm(EMPTY); setFile(null); setModalOpen(true); }

  async function openEdit(post) {
    const res = await api.get('/posts.php', { params: { id: post.id } });
    setForm({ ...EMPTY, ...res.data.post, event_date: res.data.post.event_date?.slice(0, 16) || '' });
    setFile(null);
    setModalOpen(true);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    await api.delete(`/posts.php?id=${id}`);
    setToast({ type: 'success', message: 'Post deleted.' });
    load();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && k !== 'id' && k !== 'cover_image') fd.append(k, v);
      });
      if (file) fd.append('cover_image', file);

      if (form.id) {
        await api.post(`/posts.php?id=${form.id}&_method=PUT`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/posts.php', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setToast({ type: 'success', message: `Post ${form.id ? 'updated' : 'created'}.` });
      setModalOpen(false);
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save post.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-page-header">
        <h2>News / Blog / Events</h2>
        <button className="btn btn-primary" onClick={openCreate}><FaPlus /> Add Post</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Cover</th><th>Title</th><th>Type</th><th>Category</th><th>Author</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7}>Loading…</td></tr>}
            {!loading && posts.length === 0 && <tr><td colSpan={7}>No posts yet. Click "Add Post" to create one.</td></tr>}
            {posts.map(p => (
              <tr key={p.id}>
                <td>{p.cover_image ? <img className="admin-thumb" src={assetUrl(p.cover_image)} alt="" /> : <div className="admin-thumb" />}</td>
                <td>{p.title}</td>
                <td><span className="badge">{p.type}</span></td>
                <td>{p.category || '—'}</td>
                <td>{p.author || '—'}</td>
                <td>{new Date(p.published_at).toLocaleDateString()}</td>
                <td>
                  <button className="icon-btn" onClick={() => openEdit(p)} aria-label="Edit"><FaEdit /></button>
                  <button className="icon-btn danger" onClick={() => handleDelete(p.id)} aria-label="Delete"><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <form className="modal-card" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <button type="button" className="icon-btn modal-close" onClick={() => setModalOpen(false)}><FaTimes /></button>
            <h3>{form.id ? 'Edit Post' : 'Add Post'}</h3>

            <div className="form-row">
              <label>Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="news">News</option>
                <option value="blog">Blog</option>
                <option value="event">Event</option>
              </select>
            </div>

            <div className="form-row">
              <label>Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>

            <div className="form-row">
              <label>Category</label>
              <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            </div>

            <div className="form-row">
              <label>Author</label>
              <input value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} />
            </div>

            {form.type === 'event' && (
              <>
                <div className="form-row">
                  <label>Event Date &amp; Time</label>
                  <input type="datetime-local" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Event Venue</label>
                  <input value={form.event_venue} onChange={e => setForm({ ...form, event_venue: e.target.value })} />
                </div>
              </>
            )}

            <div className="form-row">
              <label>Short Description</label>
              <textarea rows="2" value={form.short_description} onChange={e => setForm({ ...form, short_description: e.target.value })} />
            </div>

            <div className="form-row">
              <label>Full Content</label>
              <textarea rows="6" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required />
            </div>

            <div className="form-row">
              <label>Cover Image {form.cover_image && '(leave blank to keep current)'}</label>
              <input type="file" accept="image/png, image/jpeg, image/webp" onChange={e => setFile(e.target.files[0])} />
            </div>

            <div className="form-row">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Post'}</button>
            </div>
          </form>
        </div>
      )}

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
