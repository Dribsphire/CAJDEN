import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import api from '../../api/axios';
import OfficeMap from '../../components/OfficeMap.jsx';
import Toast from '../../components/Toast.jsx';

const EMPTY = { id: null, office_name: '', address: '', contact_number: '', latitude: '', longitude: '', is_main: false };

export default function ManageOffices() {
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  function load() {
    setLoading(true);
    api.get('/offices.php').then(res => setOffices(res.data.offices || [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm(EMPTY); setModalOpen(true); }
  function openEdit(o) { setForm(o); setModalOpen(true); }

  async function handleDelete(id) {
    if (!confirm('Remove this office location? It will disappear from the map.')) return;
    await api.delete(`/offices.php?id=${id}`);
    setToast({ type: 'success', message: 'Office removed.' });
    load();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) };
      if (form.id) {
        await api.put(`/offices.php?id=${form.id}`, payload);
      } else {
        await api.post('/offices.php', payload);
      }
      setToast({ type: 'success', message: `Office ${form.id ? 'updated' : 'added'}.` });
      setModalOpen(false);
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save office.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-page-header">
        <h2>Office & FBPOs Locations</h2>
        <button className="btn btn-primary" onClick={openCreate}><FaPlus /> Add Office</button>
      </div>

      <div style={{ marginBottom: 26 }}>
        <OfficeMap offices={offices} height={340} />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Office & FBPOs Name</th><th>Address</th><th>Contact</th><th>Coordinates</th><th>Actions</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={5}>Loading…</td></tr>}
            {!loading && offices.length === 0 && <tr><td colSpan={5}>No offices added yet.</td></tr>}
            {offices.map(o => (
              <tr key={o.id}>
                <td>{o.office_name} {o.is_main ? <span className="badge">Main</span> : null}</td>
                <td>{o.address}</td>
                <td>{o.contact_number || '—'}</td>
                <td>{o.latitude}, {o.longitude}</td>
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
            <h3>{form.id ? 'Edit Office' : 'Add Office'}</h3>

            <div className="form-row">
              <label>Office Name</label>
              <input value={form.office_name} onChange={e => setForm({ ...form, office_name: e.target.value })} required />
            </div>
            <div className="form-row">
              <label>Address</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required />
            </div>
            <div className="form-row">
              <label>Contact Number</label>
              <input value={form.contact_number || ''} onChange={e => setForm({ ...form, contact_number: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Latitude</label>
              <input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} required placeholder="e.g. 10.6713" />
            </div>
            <div className="form-row">
              <label>Longitude</label>
              <input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} required placeholder="e.g. 122.9511" />
            </div>
            <div className="form-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="is_main" style={{ width: 'auto' }} checked={!!form.is_main} onChange={e => setForm({ ...form, is_main: e.target.checked })} />
              <label htmlFor="is_main" style={{ margin: 0 }}>Set as main office</label>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-charcoal-soft)' }}>
              Tip: right-click a location on Google Maps to copy exact coordinates.
            </p>

            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Office'}</button>
            </div>
          </form>
        </div>
      )}

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
