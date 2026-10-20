import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaImages, FaStar, FaRegStar } from 'react-icons/fa';
import api, { assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { formatDate } from '../../utils/format.js';

const EMPTY = { id: null, title: '', category: '', description: '', event_date: '', is_featured: false };
// PHP caps a request at 20 files / 40MB (post_max_size), so photos go up in small batches.
const BATCH_SIZE = 6;
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

async function uploadPhotos(albumId, files, onProgress) {
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const fd = new FormData();
    files.slice(i, i + BATCH_SIZE).forEach(f => fd.append('photos[]', f));
    await api.post(`/album_photos.php?album_id=${albumId}`, fd, MULTIPART);
    onProgress(Math.min(files.length, i + BATCH_SIZE), files.length);
  }
}

function PhotoManager({ albumId, onClose, onChanged, notify }) {
  const [album, setAlbum] = useState(null);
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState('');

  function load() {
    api.get('/albums.php', { params: { id: albumId } }).then(res => setAlbum(res.data.album));
  }
  useEffect(load, [albumId]);

  async function addPhotos(e) {
    e.preventDefault();
    if (!files.length) return;
    try {
      await uploadPhotos(albumId, files, (done, total) => setProgress(`Uploading ${done} of ${total}…`));
      notify('success', `${files.length} photo(s) added.`);
      setFiles([]);
      e.target.reset();
      load(); onChanged();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Upload failed.');
    } finally {
      setProgress('');
    }
  }

  async function remove(photo) {
    if (!confirm('Remove this photo from the album?')) return;
    await api.delete(`/album_photos.php?id=${photo.id}`);
    load(); onChanged();
  }

  async function makeCover(photo) {
    await api.put(`/album_photos.php?id=${photo.id}`, { make_cover: true });
    load(); onChanged();
  }

  async function saveCaption(photo, caption) {
    if ((photo.caption || '') === caption) return;
    await api.put(`/album_photos.php?id=${photo.id}`, { caption });
    notify('success', 'Caption saved.');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-wide" onClick={e => e.stopPropagation()}>
        <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Close"><FaTimes /></button>
        <h3>Photos · {album?.title || '…'}</h3>

        <form onSubmit={addPhotos} className="admin-upload-row">
          <input type="file" multiple accept="image/png, image/jpeg, image/webp" onChange={e => setFiles([...e.target.files])} />
          <button className="btn btn-primary btn-sm" disabled={!files.length || !!progress}>
            {progress || <><FaPlus /> Add {files.length || ''} photo{files.length === 1 ? '' : 's'}</>}
          </button>
        </form>
        <p className="admin-hint">JPG, PNG or WEBP up to 10MB each. The first photo is the album cover.</p>

        {album && album.photos.length === 0 && <p>No photos yet.</p>}
        <div className="admin-photo-grid">
          {album?.photos.map((p, i) => (
            <figure key={p.id} className="admin-photo">
              <img src={assetUrl(p.image_path)} alt="" />
              {i === 0 && <span className="badge admin-photo-cover">Cover</span>}
              <input
                defaultValue={p.caption || ''}
                placeholder="Caption (optional)"
                onBlur={e => saveCaption(p, e.target.value.trim())}
              />
              <div className="admin-photo-actions">
                {i !== 0 && <button className="icon-btn" onClick={() => makeCover(p)} title="Make cover"><FaRegStar /></button>}
                <button className="icon-btn danger" onClick={() => remove(p)} title="Remove"><FaTrash /></button>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ManageAlbums() {
  const [albums, setAlbums] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState('');
  const [photosFor, setPhotosFor] = useState(null);
  const [toast, setToast] = useState(null);
  const notify = (type, message) => setToast({ type, message });

  function load() {
    setLoading(true);
    api.get('/albums.php')
      .then(res => { setAlbums(res.data.albums || []); setCategories(res.data.categories || []); })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm(EMPTY); setFiles([]); setModalOpen(true); }
  function openEdit(a) {
    setForm({ ...a, category: a.category || '', description: a.description || '', event_date: a.event_date || '', is_featured: Number(a.is_featured) === 1 });
    setFiles([]);
    setModalOpen(true);
  }

  async function handleDelete(a) {
    if (!confirm(`Delete "${a.title}" and all ${a.photo_count} photos? This cannot be undone.`)) return;
    await api.delete(`/albums.php?id=${a.id}`);
    notify('success', 'Album deleted.');
    load();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving('Saving…');
    try {
      const fd = new FormData();
      ['title', 'category', 'description', 'event_date'].forEach(k => fd.append(k, form[k] || ''));
      fd.append('is_featured', form.is_featured ? '1' : '0');

      let albumId = form.id;
      if (albumId) {
        await api.post(`/albums.php?id=${albumId}&_method=PUT`, fd, MULTIPART);
      } else {
        const res = await api.post('/albums.php', fd, MULTIPART);
        albumId = res.data.id;
      }
      if (files.length) {
        await uploadPhotos(albumId, files, (done, total) => setSaving(`Uploading ${done} of ${total}…`));
      }
      notify('success', `Album ${form.id ? 'updated' : 'created'}.`);
      setModalOpen(false);
      load();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Failed to save album.');
      load();
    } finally {
      setSaving('');
    }
  }

  return (
    <>
      <div className="admin-page-header">
        <h2>Photo Albums</h2>
        <button className="btn btn-primary" onClick={openCreate}><FaPlus /> New Album</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Cover</th><th>Album</th><th>Category</th><th>Date</th><th>Photos</th><th>Featured</th><th>Actions</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7}>Loading…</td></tr>}
            {!loading && albums.length === 0 && <tr><td colSpan={7}>No albums yet. Create one to start the Photos page.</td></tr>}
            {albums.map(a => (
              <tr key={a.id}>
                <td>{a.cover_path ? <img className="admin-thumb" src={assetUrl(a.cover_path)} alt="" /> : <div className="admin-thumb" />}</td>
                <td>{a.title}</td>
                <td>{a.category || '—'}</td>
                <td>{formatDate(a.event_date) || '—'}</td>
                <td>{a.photo_count}</td>
                <td>{Number(a.is_featured) ? <FaStar title="Featured" style={{ color: 'var(--orange)' }} /> : ''}</td>
                <td>
                  <button className="icon-btn" onClick={() => setPhotosFor(a.id)} aria-label="Manage photos" title="Manage photos"><FaImages /></button>
                  <button className="icon-btn" onClick={() => openEdit(a)} aria-label="Edit"><FaEdit /></button>
                  <button className="icon-btn danger" onClick={() => handleDelete(a)} aria-label="Delete"><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => !saving && setModalOpen(false)}>
          <form className="modal-card" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <button type="button" className="icon-btn modal-close" onClick={() => setModalOpen(false)} disabled={!!saving}><FaTimes /></button>
            <h3>{form.id ? 'Edit Album' : 'New Album'}</h3>

            <div className="form-row">
              <label>Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="form-row">
              <label>Category</label>
              <input list="album-categories" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Youth, Livelihood, Parish" />
              <datalist id="album-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
              <span className="hint">Albums with the same category are grouped under one filter on the Photos page.</span>
            </div>
            <div className="form-row">
              <label>Date of activity</label>
              <input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Description</label>
              <textarea rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <label className="form-check">
              <input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} />
              Feature this album at the top of the Photos page
            </label>
            <div className="form-row">
              <label>{form.id ? 'Add more photos' : 'Photos'}</label>
              <input type="file" multiple accept="image/png, image/jpeg, image/webp" onChange={e => setFiles([...e.target.files])} />
              <span className="hint">{files.length ? `${files.length} selected. ` : ''}JPG, PNG or WEBP up to 10MB each. You can add more later.</span>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)} disabled={!!saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={!!saving}>{saving || 'Save Album'}</button>
            </div>
          </form>
        </div>
      )}

      {photosFor && (
        <PhotoManager albumId={photosFor} onClose={() => setPhotosFor(null)} onChanged={load} notify={notify} />
      )}

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
