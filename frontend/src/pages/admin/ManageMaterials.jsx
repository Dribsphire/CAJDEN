import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaStar } from 'react-icons/fa';
import api, { assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { MATERIAL_TYPES } from '../../constants/materials.js';
import { fileExtension, formatBytes } from '../../utils/format.js';

const EMPTY = { id: null, title: '', type: 'module', description: '', language: '', year: String(new Date().getFullYear()), is_featured: false };

export default function ManageMaterials() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  function load() {
    setLoading(true);
    api.get('/materials.php').then(res => setItems(res.data.materials || [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm(EMPTY); setFile(null); setModalOpen(true); }
  function openEdit(m) {
    setForm({
      id: m.id, title: m.title, type: m.type, description: m.description || '',
      language: m.language || '', year: m.year ? String(m.year) : '', is_featured: Number(m.is_featured) === 1,
    });
    setFile(null);
    setModalOpen(true);
  }

  async function handleDelete(m) {
    if (!confirm(`Delete "${m.title}"? The file will be removed too.`)) return;
    await api.delete(`/materials.php?id=${m.id}`);
    setToast({ type: 'success', message: 'Material deleted.' });
    load();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.id && !file) {
      setToast({ type: 'error', message: 'Attach the file people will download.' });
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      ['title', 'type', 'description', 'language', 'year'].forEach(k => fd.append(k, form[k] ?? ''));
      fd.append('is_featured', form.is_featured ? '1' : '0');
      if (file) fd.append('file', file);
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (form.id) await api.post(`/materials.php?id=${form.id}&_method=PUT`, fd, cfg);
      else await api.post('/materials.php', fd, cfg);
      setToast({ type: 'success', message: `Material ${form.id ? 'updated' : 'added'}.` });
      setModalOpen(false);
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save material.' });
    } finally {
      setSaving(false);
    }
  }

  const typeLabel = v => MATERIAL_TYPES.find(t => t.value === v)?.label || v;

  return (
    <>
      <div className="admin-page-header">
        <h2>Materials</h2>
        <button className="btn btn-primary" onClick={openCreate}><FaPlus /> Add Material</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Type</th><th>Title</th><th>Language</th><th>Year</th><th>File</th><th>Featured</th><th>Actions</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7}>Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={7}>No materials yet. Upload modules, reports, or posters for the Materials page.</td></tr>}
            {items.map(m => (
              <tr key={m.id}>
                <td><span className="badge">{typeLabel(m.type)}</span></td>
                <td>{m.title}</td>
                <td>{m.language || '—'}</td>
                <td>{m.year || '—'}</td>
                <td><a href={assetUrl(m.file_path)} target="_blank" rel="noreferrer">{fileExtension(m.file_path)} · {formatBytes(m.file_size)}</a></td>
                <td>{Number(m.is_featured) ? <FaStar title="Featured" style={{ color: 'var(--orange)' }} /> : ''}</td>
                <td>
                  <button className="icon-btn" onClick={() => openEdit(m)} aria-label="Edit"><FaEdit /></button>
                  <button className="icon-btn danger" onClick={() => handleDelete(m)} aria-label="Delete"><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => !saving && setModalOpen(false)}>
          <form className="modal-card" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <button type="button" className="icon-btn modal-close" onClick={() => setModalOpen(false)}><FaTimes /></button>
            <h3>{form.id ? 'Edit Material' : 'Add Material'}</h3>

            <div className="form-row">
              <label>Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 16 }}>
              <div className="form-row">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {MATERIAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Year</label>
                <input type="number" min="1990" max="2100" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <label>Language(s)</label>
              <input value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} placeholder="e.g. English, Hiligaynon" />
            </div>
            <div className="form-row">
              <label>Short description</label>
              <textarea rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <label className="form-check">
              <input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} />
              Feature at the top of the Materials page
            </label>
            <div className="form-row">
              <label>File {form.id && '(leave blank to keep current)'}</label>
              <input type="file" accept=".pdf,.docx,.pptx,.xlsx" onChange={e => setFile(e.target.files[0])} />
              <span className="hint">PDF, DOCX, PPTX or XLSX up to 30MB.</span>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Material'}</button>
            </div>
          </form>
        </div>
      )}

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
