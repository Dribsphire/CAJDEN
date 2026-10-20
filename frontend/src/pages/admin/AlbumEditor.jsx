import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft, FaExternalLinkAlt, FaTrash, FaCloudUploadAlt, FaStar, FaGripVertical, FaCheck, FaTimes, FaImages,
} from 'react-icons/fa';
import api, { assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { resizeImages } from '../../utils/resizeImage.js';
import { decodeHtml, formatDate } from '../../utils/format.js';
import './PostEditor.css';
import './AlbumEditor.css';

const EMPTY = { title: '', category: '', description: '', event_date: '', is_published: '1', is_featured: '0' };
const FIELDS = Object.keys(EMPTY);
// PHP caps a request at 20 files / 40MB (post_max_size), so photos go up in small batches.
const BATCH_SIZE = 6;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

function AlbumEditorForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(EMPTY);
  const [photos, setPhotos] = useState([]);       // saved photos, in order
  const [queue, setQueue] = useState([]);         // files chosen but not uploaded yet: { key, file, url }
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);   // photo ids ticked for bulk delete
  const [drag, setDrag] = useState(null);         // { id, overId, place }
  const [dropActive, setDropActive] = useState(false);
  const [progress, setProgress] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(location.state?.toast || null);
  const fileInput = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const notify = (type, message) => setToast({ type, message });

  const loadAlbum = useCallback(() => api.get('/albums.php', { params: { id } }).then(res => {
    const a = res.data.album;
    const values = {
      title: decodeHtml(a.title),
      category: decodeHtml(a.category || ''),
      description: decodeHtml(a.description || ''),
      event_date: a.event_date || '',
      is_published: String(Number(a.is_published)),
      is_featured: String(Number(a.is_featured)),
    };
    setForm(values);
    setSaved(values);
    setPhotos(a.photos || []);
  }), [id]);

  useEffect(() => {
    api.get('/albums.php', { params: { all: 1 } }).then(res => setCategories(res.data.categories || [])).catch(() => {});
    if (isNew) return;
    loadAlbum().catch(() => setLoadError(true)).finally(() => setLoading(false));
  }, [isNew, loadAlbum]);

  const dirty = useMemo(() => FIELDS.some(k => form[k] !== saved[k]) || queue.length > 0, [form, saved, queue]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // Release preview URLs when queued files go away
  useEffect(() => () => queue.forEach(q => URL.revokeObjectURL(q.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- adding files ----------
  function addFiles(fileList) {
    const files = [...fileList];
    const ok = files.filter(f => IMAGE_TYPES.includes(f.type));
    if (ok.length < files.length) notify('error', `${files.length - ok.length} file(s) skipped: only JPG, PNG or WEBP photos.`);
    if (!ok.length) return;
    setQueue(q => [...q, ...ok.map((file, i) => ({ key: `${Date.now()}-${i}-${file.name}`, file, url: URL.createObjectURL(file) }))]);
  }
  function unqueue(key) {
    setQueue(q => {
      const item = q.find(x => x.key === key);
      if (item) URL.revokeObjectURL(item.url);
      return q.filter(x => x.key !== key);
    });
  }

  async function uploadQueue(albumId) {
    const files = queue.map(q => q.file);
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      setProgress(`Uploading photos ${Math.min(files.length, i + BATCH_SIZE)} of ${files.length}…`);
      const fd = new FormData();
      (await resizeImages(files.slice(i, i + BATCH_SIZE))).forEach(f => fd.append('photos[]', f));
      await api.post(`/album_photos.php?album_id=${albumId}`, fd, MULTIPART);
    }
    queue.forEach(q => URL.revokeObjectURL(q.url));
    setQueue([]);
  }

  // ---------- saving ----------
  const save = useCallback(async () => {
    if (!form.title.trim()) { notify('error', 'Give the album a title first.'); return; }
    setSaving(true);
    let albumId = id;
    try {
      const payload = Object.fromEntries(FIELDS.map(k => [k, form[k]]));
      if (isNew) albumId = (await api.post('/albums.php', payload)).data.id;
      else if (FIELDS.some(k => form[k] !== saved[k])) await api.put(`/albums.php?id=${id}`, payload);
      const uploaded = queue.length;
      if (uploaded) await uploadQueue(albumId);
      setSaved(form);
      const message = `Album saved${uploaded ? ` with ${uploaded} new photo${uploaded === 1 ? '' : 's'}` : ''}.`;
      if (isNew) {
        navigate(`/admin/albums/${albumId}`, { replace: true, state: { toast: { type: 'success', message } } });
        return;
      }
      await loadAlbum();
      notify('success', message);
    } catch (err) {
      notify('error', err.response?.data?.message || 'Saving failed. Photos already uploaded are kept.');
      // A new album may exist even if a photo batch failed; continue on its edit page.
      if (isNew && albumId) navigate(`/admin/albums/${albumId}`, { replace: true });
    } finally {
      setSaving(false);
      setProgress('');
    }
  }, [form, saved, queue, isNew, id, navigate, loadAlbum]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!saving) save(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [save, saving]);

  // ---------- photo actions (saved immediately) ----------
  async function saveOrder(list, message = 'Order saved.') {
    setPhotos(list);
    try {
      await api.post(`/album_photos.php?album_id=${id}&action=reorder`, { order: list.map(p => p.id) });
      notify('success', message);
    } catch {
      notify('error', 'Could not save the new order.');
      loadAlbum();
    }
  }
  function makeCover(photo) {
    saveOrder([photo, ...photos.filter(p => p.id !== photo.id)], 'Cover photo updated.');
  }
  async function saveCaption(photo, caption) {
    if ((photo.caption || '') === caption) return;
    await api.put(`/album_photos.php?id=${photo.id}`, { caption });
    setPhotos(list => list.map(p => (p.id === photo.id ? { ...p, caption } : p)));
    notify('success', 'Caption saved.');
  }
  async function removePhotos(ids) {
    if (!ids.length) return;
    if (!confirm(`Remove ${ids.length} photo${ids.length === 1 ? '' : 's'} from this album? This cannot be undone.`)) return;
    await api.post(`/album_photos.php?album_id=${id}&action=delete`, { ids });
    setSelected([]);
    notify('success', `${ids.length} photo${ids.length === 1 ? '' : 's'} removed.`);
    loadAlbum();
  }
  const toggleSelect = photoId => setSelected(s => (s.includes(photoId) ? s.filter(x => x !== photoId) : [...s, photoId]));

  function dropOnPhoto(target) {
    if (!drag || drag.id === target.id) { setDrag(null); return; }
    const moving = photos.find(p => p.id === drag.id);
    const list = photos.filter(p => p.id !== drag.id);
    let at = list.findIndex(p => p.id === target.id);
    if (drag.place === 'after') at += 1;
    list.splice(at, 0, moving);
    setDrag(null);
    saveOrder(list, at === 0 ? 'Cover photo updated.' : 'Order saved.');
  }

  function leave(e) {
    if (dirty && !confirm('You have unsaved changes. Leave without saving?')) e.preventDefault();
  }
  async function handleDelete() {
    if (!confirm(`Delete this album and all ${photos.length} photos? This cannot be undone.`)) return;
    await api.delete(`/albums.php?id=${id}`);
    setSaved(form);
    setQueue([]);
    navigate('/admin/albums', { replace: true });
  }

  if (loading) return <div className="admin-loading">Loading album…</div>;
  if (loadError) {
    return (
      <div className="pe-error">
        <h2>That album could not be loaded.</h2>
        <p>It may have been deleted, or the connection dropped. Nothing was changed.</p>
        <Link to="/admin/albums" className="btn btn-primary"><FaArrowLeft /> Back to albums</Link>
      </div>
    );
  }

  const published = form.is_published === '1';
  const featured = form.is_featured === '1';
  const coverSrc = photos[0] ? assetUrl(photos[0].image_path) : queue[0]?.url;
  const total = photos.length + queue.length;

  return (
    <form className="pe" onSubmit={e => { e.preventDefault(); save(); }}>
      <div className="pe-topbar">
        <Link to="/admin/albums" className="pe-back" onClick={leave}><FaArrowLeft /> All albums</Link>
        <div className="pe-topbar-title">
          <h2>{isNew ? 'New album' : 'Edit album'}</h2>
          <span className={`pe-state ${dirty ? 'is-dirty' : ''}`}>
            {progress || (dirty ? (queue.length ? `${queue.length} photo${queue.length === 1 ? '' : 's'} waiting to upload` : 'Unsaved changes') : isNew ? 'Not saved yet' : saved.is_published === '1' ? 'Published · saved' : 'Hidden · saved')}
          </span>
        </div>
        <div className="pe-topbar-actions">
          {isNew ? (
            <span className="btn btn-outline btn-sm is-disabled" aria-disabled="true" title="Save the album first">View site <FaExternalLinkAlt /></span>
          ) : (
            <a className="btn btn-outline btn-sm" href={`/photos/${id}`} target="_blank" rel="noreferrer"
              title={saved.is_published !== '1' ? 'Hidden albums are only visible to admins' : 'Open the album in a new tab'}>
              View site <FaExternalLinkAlt />
            </a>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : queue.length ? `Save & upload ${queue.length}` : isNew ? 'Create album' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="pe-layout">
        <div className="pe-main">
          <label className="sr-only" htmlFor="alb-title">Album title</label>
          <textarea
            id="alb-title" className="pe-title" rows={1} placeholder="Album title"
            value={form.title} onChange={e => set('title', e.target.value.replace(/\n/g, ' '))}
            ref={el => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
          />

          <div className="pe-field">
            <label htmlFor="alb-desc" className="pe-label">Description</label>
            <textarea id="alb-desc" rows={3} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="What happened, where, and who took part." />
          </div>

          {/* ---------- photos ---------- */}
          <div className="pe-field">
            <div className="pe-field-head">
              <span className="pe-label">Photos</span>
              <span className="pe-count">{total} photo{total === 1 ? '' : 's'}{photos.length > 1 ? ' · drag to reorder, the first is the cover' : ''}</span>
            </div>

            <div
              className={`alb-drop ${dropActive ? 'is-active' : ''}`}
              onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDropActive(true); } }}
              onDragLeave={() => setDropActive(false)}
              onDrop={e => { if (!e.dataTransfer.files.length) return; e.preventDefault(); setDropActive(false); addFiles(e.dataTransfer.files); }}
              onClick={() => fileInput.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.current?.click(); } }}
            >
              <FaCloudUploadAlt />
              <strong>Drop photos here or click to choose</strong>
              <span className="mono">JPG, PNG or WEBP · any number · resized automatically</span>
            </div>
            <input ref={fileInput} type="file" multiple hidden accept="image/png, image/jpeg, image/webp"
              onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />

            {queue.length > 0 && (
              <div className="alb-queue">
                <div className="alb-queue-head">
                  <span className="mono">Waiting to upload · {queue.length}</span>
                  <button type="button" className="pe-link" onClick={() => { queue.forEach(q => URL.revokeObjectURL(q.url)); setQueue([]); }}>Clear</button>
                </div>
                <ul className="alb-photos alb-photos-queue">
                  {queue.map(q => (
                    <li key={q.key} className="alb-photo is-queued">
                      <img src={q.url} alt="" />
                      <button type="button" className="alb-photo-x" onClick={() => unqueue(q.key)} aria-label={`Remove ${q.file.name}`}><FaTimes /></button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.length > 0 && (
              <div className="alb-bulk">
                <span><strong>{selected.length}</strong> selected</span>
                <button type="button" className="pe-link" onClick={() => setSelected(photos.map(p => p.id))}>Select all</button>
                <button type="button" className="pe-link" onClick={() => setSelected([])}>Clear</button>
                <button type="button" className="btn btn-sm alb-bulk-delete" onClick={() => removePhotos(selected)}><FaTrash /> Remove selected</button>
              </div>
            )}

            {photos.length > 0 && (
              <ul className="alb-photos">
                {photos.map((p, i) => {
                  const isSel = selected.includes(p.id);
                  return (
                    <li
                      key={p.id}
                      className={`alb-photo ${isSel ? 'is-selected' : ''} ${drag?.id === p.id ? 'is-dragging' : ''} ${drag?.overId === p.id && drag.id !== p.id ? `is-target-${drag.place}` : ''}`}
                      draggable
                      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(p.id)); setDrag({ id: p.id, overId: null, place: 'before' }); }}
                      onDragOver={e => {
                        if (!drag) return;
                        e.preventDefault();
                        const r = e.currentTarget.getBoundingClientRect();
                        const place = e.clientX < r.left + r.width / 2 ? 'before' : 'after';
                        if (drag.overId !== p.id || drag.place !== place) setDrag(d => ({ ...d, overId: p.id, place }));
                      }}
                      onDrop={e => { e.preventDefault(); dropOnPhoto(p); }}
                      onDragEnd={() => setDrag(null)}
                    >
                      <div className="alb-photo-img">
                        <img src={assetUrl(p.image_path)} alt={p.caption || ''} loading="lazy" />
                        <span className="alb-photo-grip" aria-hidden="true"><FaGripVertical /></span>
                        {i === 0 && <span className="svc-badge alb-photo-cover"><FaStar /> Cover</span>}
                        <button type="button" className={`alb-photo-check ${isSel ? 'is-on' : ''}`} onClick={() => toggleSelect(p.id)} aria-pressed={isSel} aria-label={isSel ? 'Unselect photo' : 'Select photo'}>
                          {isSel && <FaCheck />}
                        </button>
                        <div className="alb-photo-tools">
                          {i !== 0 && <button type="button" onClick={() => makeCover(p)} title="Make this the cover"><FaStar /> Cover</button>}
                          <button type="button" onClick={() => removePhotos([p.id])} title="Remove photo" className="is-danger"><FaTrash /></button>
                        </div>
                      </div>
                      <input
                        className="alb-photo-caption"
                        defaultValue={p.caption || ''}
                        placeholder="Add a caption"
                        maxLength={255}
                        onBlur={e => saveCaption(p, e.target.value.trim())}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
                        aria-label={`Caption for photo ${i + 1}`}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
            {!isNew && photos.length === 0 && queue.length === 0 && <p className="pe-hint">No photos yet. Drop some in above.</p>}
            {!isNew && photos.length > 0 && <p className="pe-hint">Reordering, captions and removals save right away.</p>}
          </div>
        </div>

        {/* ---------- sidebar ---------- */}
        <aside className="pe-side">
          <section className="pe-panel">
            <h3>Visibility</h3>
            <div className="pe-segment" role="radiogroup" aria-label="Visibility">
              {[['1', 'Published'], ['0', 'Hidden']].map(([value, label]) => (
                <button key={value} type="button" role="radio" aria-checked={form.is_published === value}
                  className={form.is_published === value ? 'is-on' : ''} onClick={() => set('is_published', value)}>{label}</button>
              ))}
            </div>
            <label className="form-check alb-featured">
              <input type="checkbox" checked={featured} onChange={e => set('is_featured', e.target.checked ? '1' : '0')} />
              Feature at the top of the Photos page
            </label>
            <p className="pe-hint">
              {!published ? 'Hidden albums stay in the admin until you publish them.' : featured ? 'Only one album can be featured; this replaces the current one.' : 'Shown on the Photos page.'}
            </p>
            {!isNew && <button type="button" className="pe-delete" onClick={handleDelete}><FaTrash /> Delete album</button>}
          </section>

          <section className="pe-panel">
            <h3>Details</h3>
            <div className="form-row">
              <label htmlFor="alb-category">Category</label>
              <input id="alb-category" list="alb-categories" value={form.category} onChange={e => set('category', e.target.value)} placeholder="e.g. Youth, Livelihood, Parish" />
              <datalist id="alb-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
              <span className="hint">Albums with the same category share a filter on the Photos page.</span>
            </div>
            <div className="form-row">
              <label htmlFor="alb-date">Date of activity</label>
              <input id="alb-date" type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} />
            </div>
          </section>

          <section className="pe-panel pe-panel-preview">
            <h3>Card preview</h3>
            <p className="pe-hint">How the album appears on the Photos page.</p>
            <div className="alb-prev">
              <div className="alb-prev-cover">
                {coverSrc ? <img src={coverSrc} alt="" /> : <span className="alb-card-nocover"><FaImages /> No photos yet</span>}
                <span className="alb-card-count mono">{total} photo{total === 1 ? '' : 's'}</span>
              </div>
              <span className="mono alb-card-meta">{[form.category, formatDate(form.event_date, { month: 'short', year: 'numeric' })].filter(Boolean).join(' · ') || 'Category · date'}</span>
              <strong className="serif">{form.title || 'Album title'}</strong>
            </div>
          </section>
        </aside>
      </div>

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </form>
  );
}

// New and edit share this component; key by id for a fresh editor after the first save.
export default function AlbumEditor() {
  const { id } = useParams();
  return <AlbumEditorForm key={id || 'new'} />;
}
