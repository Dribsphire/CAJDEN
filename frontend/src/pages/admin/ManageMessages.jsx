import { useEffect, useState } from 'react';
import { FaTrash, FaEnvelopeOpen, FaEnvelope, FaTimes } from 'react-icons/fa';
import api from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { UNREAD_EVENT } from './AdminLayout.jsx';

export default function ManageMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [toast, setToast] = useState(null);

  function load() {
    setLoading(true);
    api.get('/admin/messages.php')
      .then(res => {
        const list = res.data.messages || [];
        setMessages(list);
        // Keep the sidebar badge in sync without another request.
        window.dispatchEvent(new CustomEvent(UNREAD_EVENT, { detail: list.filter(m => !Number(m.is_read)).length }));
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function openMessage(m) {
    setActive(m);
    if (!m.is_read) {
      await api.put(`/admin/messages.php?id=${m.id}`, { is_read: true });
      load();
    }
  }

  async function toggleRead(m, e) {
    e.stopPropagation();
    await api.put(`/admin/messages.php?id=${m.id}`, { is_read: !m.is_read });
    load();
  }

  async function handleDelete(id, e) {
    e?.stopPropagation();
    if (!confirm('Delete this message?')) return;
    await api.delete(`/admin/messages.php?id=${id}`);
    setToast({ type: 'success', message: 'Message deleted.' });
    setActive(null);
    load();
  }

  return (
    <>
      <div className="admin-page-header"><h2>Contact Messages</h2></div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th></th><th>Sender</th><th>Email</th><th>Subject</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6}>Loading…</td></tr>}
            {!loading && messages.length === 0 && <tr><td colSpan={6}>No messages received yet.</td></tr>}
            {messages.map(m => (
              <tr key={m.id} onClick={() => openMessage(m)} style={{ cursor: 'pointer', fontWeight: m.is_read ? 400 : 700 }}>
                <td>{m.is_read ? <FaEnvelopeOpen style={{ color: 'var(--color-charcoal-soft)' }} /> : <FaEnvelope style={{ color: 'var(--color-gold-dark)' }} />}</td>
                <td>{m.full_name}</td>
                <td>{m.email}</td>
                <td>{m.subject}</td>
                <td>{new Date(m.sent_at).toLocaleDateString()}</td>
                <td>
                  <button className="icon-btn" onClick={(e) => toggleRead(m, e)} aria-label="Toggle read">
                    {m.is_read ? <FaEnvelope /> : <FaEnvelopeOpen />}
                  </button>
                  <button className="icon-btn danger" onClick={(e) => handleDelete(m.id, e)} aria-label="Delete"><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active && (
        <div className="modal-overlay" onClick={() => setActive(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button className="icon-btn modal-close" onClick={() => setActive(null)}><FaTimes /></button>
            <h3>{active.subject}</h3>
            <p><strong>From:</strong> {active.full_name} ({active.email})</p>
            <p><strong>Date:</strong> {new Date(active.sent_at).toLocaleString()}</p>
            <p style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>{active.message}</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={(e) => handleDelete(active.id, e)}><FaTrash /> Delete</button>
              <a className="btn btn-primary" href={`mailto:${active.email}?subject=${encodeURIComponent('Re: ' + active.subject)}`}>Reply by Email</a>
            </div>
          </div>
        </div>
      )}

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
