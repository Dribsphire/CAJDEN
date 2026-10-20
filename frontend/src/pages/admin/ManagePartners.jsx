import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import api from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { decodeHtml, decodeRecord } from '../../utils/format.js';

const EMPTY = { id: null, org_name: '', sort_order: 0 };

export default function ManagePartners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  function load() {
    setLoading(true);
    api.get('/partners.php').then(res => setPartners(res.data.partners || [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm({ ...EMPTY, sort_order: partners.length }); setModalOpen(true); }
  function openEdit(p) { setForm(decodeRecord(p)); setModalOpen(true); }

  async function handleDelete(id) {
    if (!confirm('Remove this partner organization?')) return;
    await api.delete(`/partners.php?id=${id}`);
    setToast({ type: 'success', message: 'Partner organization removed.' });
    load();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/partners.php?id=${form.id}`, form);
      } else {
        await api.post('/partners.php', form);
      }
      setToast({ type: 'success', message: `Partner organization ${form.id ? 'updated' : 'added'}.` });
      setModalOpen(false);
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save partner organization.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-page-header">
        <h2>Partner Organizations</h2>
        <button className="btn btn-primary" onClick={openCreate}><FaPlus /> Add Partner</button>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-charcoal-soft)', marginTop: -10, marginBottom: 20 }}>
        These appear as the row of community/partner organization chips at the bottom of the org chart
        on the About page (e.g. affiliated community associations or federations).
      </p>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Order</th><th>Organization Name</th><th>Actions</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={3}>Loading…</td></tr>}
            {!loading && partners.length === 0 && <tr><td colSpan={3}>No partner organizations added yet.</td></tr>}
            {partners.map(p => (
              <tr key={p.id}>
                <td>{p.sort_order}</td>
                <td>{decodeHtml(p.org_name)}</td>
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
            <h3>{form.id ? 'Edit Partner Organization' : 'Add Partner Organization'}</h3>

            <div className="form-row">
              <label>Organization Name / Acronym</label>
              <input value={form.org_name} onChange={e => setForm({ ...form, org_name: e.target.value })} required placeholder="e.g. KAFABD" />
            </div>
            <div className="form-row">
              <label>Display Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
