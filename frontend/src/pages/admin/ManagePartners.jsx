import { useEffect, useRef, useState } from 'react';
import { FaPlus, FaTrash, FaTimes, FaImage, FaExternalLinkAlt, FaSearch } from 'react-icons/fa';
import api, { assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { decodeHtml } from '../../utils/format.js';
import { resizeImage } from '../../utils/resizeImage.js';
import './ManageOfficers.css';
import './ManagePartners.css';

export default function ManagePartners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // { id, org_name, photo_path }
  const [file, setFile] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInput = useRef(null);

  function load() {
    return api.get('/partners.php')
      .then(res => setPartners(res.data.partners || []))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const [filePreview, setFilePreview] = useState(null);
  useEffect(() => {
    if (!file) { setFilePreview(null); return; }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function open(partner) {
    setToast(null);
    setEditing(partner
      ? { id: partner.id, org_name: decodeHtml(partner.org_name), photo_path: partner.photo_path || null }
      : { id: null, org_name: '', photo_path: null });
    setFile(null);
    setRemovePhoto(false);
  }
  function close() { if (!saving) setEditing(null); }

  useEffect(() => {
    if (!editing) return;
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  async function handleDelete(p) {
    const name = decodeHtml(p.org_name);
    if (!confirm(`Remove ${name}? Its photo will be deleted too.`)) return;
    await api.delete(`/partners.php?id=${p.id}`);
    setToast({ type: 'success', message: `${name} removed.` });
    if (editing?.id === p.id) setEditing(null);
    load();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('org_name', editing.org_name.trim());
      if (file) fd.append('photo', await resizeImage(file, { maxDimension: 1200 }));
      else if (removePhoto) fd.append('remove_photo', '1');
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editing.id) await api.post(`/partners.php?id=${editing.id}&_method=PUT`, fd, cfg);
      else await api.post('/partners.php', fd, cfg);
      setToast({ type: 'success', message: `${editing.org_name.trim()} ${editing.id ? 'updated' : 'added'}.` });
      setEditing(null);
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save FBPO.' });
    } finally {
      setSaving(false);
    }
  }

  const q = query.trim().toLowerCase();
  const shown = q ? partners.filter(p => decodeHtml(p.org_name).toLowerCase().includes(q)) : partners;
  const withPhoto = partners.filter(p => p.photo_path).length;
  const previewSrc = filePreview || (!removePhoto && editing?.photo_path ? assetUrl(editing.photo_path) : null);

  return (
    <div className="fbpo">
      <div className="admin-page-header">
        <div>
          <h2>Partner FBPOs</h2>
          <p className="ofc-sub">Faith-based people's organizations shown at the bottom of the org chart on the About page, in alphabetical order.</p>
        </div>
        <div className="ofc-header-actions">
          <a className="btn btn-outline btn-sm" href="/about" target="_blank" rel="noreferrer">View chart <FaExternalLinkAlt /></a>
          <button className="btn btn-primary" onClick={() => open(null)}><FaPlus /> Add FBPO</button>
        </div>
      </div>

      {!loading && partners.length > 0 && (
        <div className="fbpo-toolbar">
          <div className="ofc-summary">
            <span><strong>{partners.length}</strong> FBPOs</span>
            <span><strong>{withPhoto}</strong> with photo</span>
          </div>
          <label className="search-field fbpo-search">
            <FaSearch aria-hidden="true" />
            <span className="sr-only">Search FBPOs</span>
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search FBPOs…" />
          </label>
        </div>
      )}

      {loading && <div className="admin-loading">Loading…</div>}
      {!loading && partners.length === 0 && <p className="ofc-empty">No FBPOs yet. Add the first one.</p>}
      {!loading && partners.length > 0 && shown.length === 0 && <p className="ofc-empty">No FBPO matches "{query}".</p>}

      <ul className="fbpo-grid">
        {shown.map(p => (
          <li key={p.id} className="fbpo-tile">
            <button type="button" className="fbpo-tile-main" onClick={() => open(p)} aria-label={`Edit ${decodeHtml(p.org_name)}`}>
              {p.photo_path
                ? <img src={assetUrl(p.photo_path)} alt="" loading="lazy" />
                : <span className="fbpo-nophoto"><FaImage /> Add photo</span>}
              <strong>{decodeHtml(p.org_name)}</strong>
            </button>
            <button type="button" className="icon-btn danger fbpo-remove" onClick={() => handleDelete(p)} aria-label={`Remove ${decodeHtml(p.org_name)}`}><FaTrash /></button>
          </li>
        ))}
      </ul>

      {editing && (
        <div className="ofc-drawer-scrim" onClick={close}>
          <form className="ofc-drawer" onClick={e => e.stopPropagation()} onSubmit={handleSubmit} aria-label={editing.id ? 'Edit FBPO' : 'Add FBPO'}>
            <header className="ofc-drawer-head">
              <h3>{editing.id ? 'Edit FBPO' : 'Add FBPO'}</h3>
              <button type="button" className="icon-btn" onClick={close} aria-label="Close"><FaTimes /></button>
            </header>

            <div className="ofc-drawer-body">
              <div className="form-row">
                <label htmlFor="fbpo-name">Name or acronym</label>
                <input id="fbpo-name" value={editing.org_name} onChange={e => setEditing(f => ({ ...f, org_name: e.target.value }))} required autoFocus placeholder="e.g. KAFABD" />
              </div>

              <span className="ofc-field-label">Photo</span>
              {previewSrc ? (
                <div className="fbpo-photo">
                  <img src={previewSrc} alt="" />
                  <div className="fbpo-photo-actions">
                    <button type="button" className="btn btn-sm" onClick={() => fileInput.current?.click()}><FaImage /> Replace photo</button>
                    <button type="button" className="ofc-link" onClick={() => { setFile(null); setRemovePhoto(Boolean(editing.photo_path)); }}>Remove photo</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="fbpo-drop" onClick={() => fileInput.current?.click()}>
                  <FaImage />
                  <span>Choose a photo</span>
                  <span className="mono">A group photo or logo · resized automatically</span>
                </button>
              )}
              <input
                ref={fileInput} type="file" hidden accept="image/png, image/jpeg, image/webp"
                onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setFile(f); setRemovePhoto(false); } }}
              />
              <p className="ofc-hint">Shown as a landscape tile (4:3) on the About page. Without a photo, the name is shown on its own.</p>
            </div>

            <footer className="ofc-drawer-foot">
              {editing.id && (
                <button type="button" className="ofc-delete" onClick={() => handleDelete(editing)}><FaTrash /> Remove</button>
              )}
              <button type="button" className="btn btn-outline btn-sm" onClick={close} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing.id ? 'Save changes' : 'Add FBPO'}</button>
            </footer>
          </form>
        </div>
      )}

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </div>
  );
}
