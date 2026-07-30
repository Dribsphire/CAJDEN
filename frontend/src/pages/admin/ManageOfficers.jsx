import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import api, { assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';

const RANK_OPTIONS = [
  { value: 1, label: 'Board of Trustees Member' },
  { value: 2, label: 'Executive Director' },
  { value: 3, label: 'Department Staff' },
];

// Must match the DEPARTMENTS list in components/Hierarchy.jsx
const DEPARTMENTS = ['Finance', 'Program', 'Community Development Worker', 'Volunteers'];

const EMPTY = { id: null, full_name: '', position_title: '', rank_level: 1, department: '', short_description: '', sort_order: 0 };

export default function ManageOfficers() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  function load() {
    setLoading(true);
    api.get('/officers.php').then(res => setOfficers(res.data.officers || [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm(EMPTY); setFile(null); setModalOpen(true); }
  function openEdit(o) { setForm({ ...EMPTY, ...o }); setFile(null); setModalOpen(true); }

  async function handleDelete(id) {
    if (!confirm('Remove this officer from the hierarchy?')) return;
    await api.delete(`/officers.php?id=${id}`);
    setToast({ type: 'success', message: 'Officer removed.' });
    load();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.rank_level === 3 && !form.department) {
      setToast({ type: 'error', message: 'Please select a department for department staff.' });
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== null && k !== 'id') fd.append(k, v); });
      if (file) fd.append('photo', file);

      if (form.id) {
        await api.post(`/officers.php?id=${form.id}&_method=PUT`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/officers.php', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setToast({ type: 'success', message: `Officer ${form.id ? 'updated' : 'added'}.` });
      setModalOpen(false);
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save officer.' });
    } finally {
      setSaving(false);
    }
  }

  // Move an officer up/down within the list and persist new sort_order
  async function move(index, direction) {
    const next = [...officers];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    setOfficers(next);

    const order = next.map((o, i) => ({ id: o.id, rank_level: o.rank_level, sort_order: i }));
    await api.post('/admin/reorder_officers.php', { order });
    load();
  }

  return (
    <>
      <div className="admin-page-header">
        <h2>Officers &amp; Hierarchy</h2>
        <button className="btn btn-primary" onClick={openCreate}><FaPlus /> Add Officer</button>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-charcoal-soft)', marginTop: -10, marginBottom: 20 }}>
        This list drives the org chart on the About page: Board of Trustees members branch from the top box,
        the Executive Director sits below, and Department Staff are grouped under Finance / Program /
        Community Development Worker / Volunteers.
      </p>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Photo</th><th>Name</th><th>Position</th><th>Rank</th><th>Department</th><th>Reorder</th><th>Actions</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7}>Loading…</td></tr>}
            {!loading && officers.length === 0 && <tr><td colSpan={7}>No officers added yet.</td></tr>}
            {officers.map((o, i) => (
              <tr key={o.id}>
                <td>{o.photo_path ? <img className="admin-thumb" src={assetUrl(o.photo_path)} alt="" /> : <div className="admin-thumb" />}</td>
                <td>{o.full_name}</td>
                <td>{o.position_title}</td>
                <td>{RANK_OPTIONS.find(r => r.value === Number(o.rank_level))?.label || o.rank_level}</td>
                <td>{o.department || '—'}</td>
                <td>
                  <button className="icon-btn" onClick={() => move(i, -1)} aria-label="Move up"><FaArrowUp /></button>
                  <button className="icon-btn" onClick={() => move(i, 1)} aria-label="Move down"><FaArrowDown /></button>
                </td>
                <td>
                  <button className="icon-btn" onClick={() => openEdit(o)} aria-label="Edit"><FaEdit /></button>
                  <button className="icon-btn danger" onClick={() => handleDelete(o.id)} aria-label="Delete"><FaTrash /></button>
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
            <h3>{form.id ? 'Edit Officer' : 'Add Officer'}</h3>

            <div className="form-row">
              <label>Full Name</label>
              <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div className="form-row">
              <label>Position Title</label>
              <input value={form.position_title} onChange={e => setForm({ ...form, position_title: e.target.value })} required placeholder="e.g. Board Chair, Finance Officer" />
            </div>
            <div className="form-row">
              <label>Hierarchy Level</label>
              <select value={form.rank_level} onChange={e => setForm({ ...form, rank_level: Number(e.target.value), department: Number(e.target.value) === 3 ? form.department : '' })}>
                {RANK_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {form.rank_level === 3 && (
              <div className="form-row">
                <label>Department</label>
                <select value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })} required>
                  <option value="" disabled>Select a department…</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}

            <div className="form-row">
              <label>Short Description (optional)</label>
              <textarea rows="3" value={form.short_description || ''} onChange={e => setForm({ ...form, short_description: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Photo {form.photo_path && '(leave blank to keep current)'}</label>
              <input type="file" accept="image/png, image/jpeg, image/webp" onChange={e => setFile(e.target.files[0])} />
              <span style={{ fontSize: '0.78rem', color: 'var(--color-charcoal-soft)' }}>
                No photo yet? A placeholder silhouette icon is shown automatically on the site.
              </span>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Officer'}</button>
            </div>
          </form>
        </div>
      )}

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
