import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import * as Icons from 'react-icons/fa';
import api, { assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { decodeHtml, decodeRecord } from '../../utils/format.js';
import { resizeImage } from '../../utils/resizeImage.js';

const ICON_OPTIONS = ['FaHandsHelping', 'FaHeartbeat', 'FaGraduationCap', 'FaHandHoldingHeart', 'FaLeaf', 'FaUsers', 'FaHome', 'FaBookReader'];
const EMPTY = { id: null, title: '', description: '', icon: 'FaHandsHelping' };

export default function ManageServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  function load() {
    setLoading(true);
    api.get('/services.php').then(res => setServices(res.data.services || [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm(EMPTY); setFile(null); setModalOpen(true); }
  function openEdit(s) { setForm(decodeRecord(s)); setFile(null); setModalOpen(true); }

  async function handleDelete(id) {
    if (!confirm('Delete this service?')) return;
    await api.delete(`/services.php?id=${id}`);
    setToast({ type: 'success', message: 'Service deleted.' });
    load();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('icon', form.icon);
      if (file) fd.append('image', await resizeImage(file));

      if (form.id) {
        await api.post(`/services.php?id=${form.id}&_method=PUT`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/services.php', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setToast({ type: 'success', message: `Service ${form.id ? 'updated' : 'added'}.` });
      setModalOpen(false);
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save service.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-page-header">
        <h2>Services</h2>
        <button className="btn btn-primary" onClick={openCreate}><FaPlus /> Add Service</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Image</th><th>Icon</th><th>Title</th><th>Description</th><th>Actions</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={5}>Loading…</td></tr>}
            {!loading && services.length === 0 && <tr><td colSpan={5}>No services added yet.</td></tr>}
            {services.map(s => {
              const Icon = Icons[s.icon] || Icons.FaHandsHelping;
              return (
                <tr key={s.id}>
                  <td>{s.image_path ? <img className="admin-thumb" src={assetUrl(s.image_path)} alt="" /> : <div className="admin-thumb" />}</td>
                  <td><Icon /></td>
                  <td>{decodeHtml(s.title)}</td>
                  <td style={{ maxWidth: 320 }}>{decodeHtml(s.description)}</td>
                  <td>
                    <button className="icon-btn" onClick={() => openEdit(s)} aria-label="Edit"><FaEdit /></button>
                    <button className="icon-btn danger" onClick={() => handleDelete(s.id)} aria-label="Delete"><FaTrash /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <form className="modal-card" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <button type="button" className="icon-btn modal-close" onClick={() => setModalOpen(false)}><FaTimes /></button>
            <h3>{form.id ? 'Edit Service' : 'Add Service'}</h3>

            <div className="form-row">
              <label>Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="form-row">
              <label>Description</label>
              <textarea rows="4" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="form-row">
              <label>Icon</label>
              <select value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}>
                {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Image {form.image_path && '(leave blank to keep current)'}</label>
              <input type="file" accept="image/png, image/jpeg, image/webp" onChange={e => setFile(e.target.files[0])} />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Service'}</button>
            </div>
          </form>
        </div>
      )}

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
