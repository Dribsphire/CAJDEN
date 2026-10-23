import { useEffect, useState } from 'react';
import { FaTrash, FaEnvelopeOpen, FaEnvelope, FaTimes, FaReply, FaCheck, FaPaperPlane, FaExclamationTriangle } from 'react-icons/fa';
import api from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { UNREAD_EVENT } from './AdminLayout.jsx';
import { decodeHtml, formatDate } from '../../utils/format.js';
import './ManageOfficers.css';
import './ManageMessages.css';

const FULL_DATE = { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' };

export default function ManageMessages() {
  const [messages, setMessages] = useState([]);
  const [mailReady, setMailReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState(null);
  const notify = (type, message) => setToast({ type, message });

  function load() {
    return api.get('/admin/messages.php')
      .then(res => {
        const list = res.data.messages || [];
        setMessages(list);
        setMailReady(res.data.mail_configured !== false);
        // Keep the sidebar badge in sync without another request.
        window.dispatchEvent(new CustomEvent(UNREAD_EVENT, { detail: list.filter(m => !Number(m.is_read)).length }));
      })
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const active = messages.find(m => m.id === activeId) || null;

  async function openMessage(m) {
    setActiveId(m.id);
    setReply('');
    if (!Number(m.is_read)) {
      await api.put(`/admin/messages.php?id=${m.id}`, { is_read: true });
      load();
    }
  }
  function close() { if (!sending) setActiveId(null); }

  useEffect(() => {
    if (!activeId) return;
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  async function toggleRead(m, e) {
    e.stopPropagation();
    await api.put(`/admin/messages.php?id=${m.id}`, { is_read: !Number(m.is_read) });
    load();
  }

  async function handleDelete(id, e) {
    e?.stopPropagation();
    if (!confirm('Delete this message?')) return;
    await api.delete(`/admin/messages.php?id=${id}`);
    notify('success', 'Message deleted.');
    if (activeId === id) setActiveId(null);
    load();
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/admin/messages.php?id=${active.id}&action=reply`, { reply });
      notify('success', res.data.message);
      setReply('');
      load();
    } catch (err) {
      notify('error', err.response?.data?.message || 'The reply could not be sent.');
    } finally {
      setSending(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    try {
      const res = await api.post('/admin/mail_test.php', {});
      notify('success', res.data.message);
    } catch (err) {
      notify('error', err.response?.data?.message || 'Test email failed.');
    } finally {
      setTesting(false);
    }
  }

  const unread = messages.filter(m => !Number(m.is_read)).length;
  const replied = messages.filter(m => m.replied_at).length;

  return (
    <div className="msg">
      <div className="admin-page-header">
        <div>
          <h2>Contact Messages</h2>
          <p className="ofc-sub">Messages from the Contact page. Each one is also emailed to the CAJDEN inbox, and you can reply from here.</p>
        </div>
        <div className="ofc-header-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={sendTest} disabled={testing}>
            <FaPaperPlane /> {testing ? 'Sending…' : 'Send test email'}
          </button>
        </div>
      </div>

      {!mailReady && (
        <p className="ofc-warning"><FaExclamationTriangle /> Email isn't set up yet, so new messages are saved here but not emailed, and replies can't be sent. Add the Gmail App Password in <code>backend/.env</code>.</p>
      )}

      {!loading && messages.length > 0 && (
        <div className="ofc-summary">
          <span><strong>{messages.length}</strong> messages</span>
          <span><strong>{unread}</strong> unread</span>
          <span><strong>{replied}</strong> replied</span>
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table msg-table">
          <thead><tr><th></th><th>Sender</th><th>Subject</th><th>Status</th><th>Received</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6}>Loading…</td></tr>}
            {!loading && messages.length === 0 && <tr><td colSpan={6}>No messages received yet.</td></tr>}
            {messages.map(m => {
              const isUnread = !Number(m.is_read);
              return (
                <tr key={m.id} onClick={() => openMessage(m)} className={`${isUnread ? 'is-unread' : ''} ${m.id === activeId ? 'is-active' : ''}`}>
                  <td>{isUnread ? <FaEnvelope className="msg-icon-unread" /> : <FaEnvelopeOpen className="msg-icon-read" />}</td>
                  <td><strong>{decodeHtml(m.full_name)}</strong><br /><span className="msg-email">{m.email}</span></td>
                  <td>{decodeHtml(m.subject)}</td>
                  <td>
                    {m.replied_at
                      ? <span className="svc-badge msg-badge-replied"><FaCheck /> Replied</span>
                      : isUnread ? <span className="svc-badge msg-badge-new">New</span> : <span className="msg-muted">Read</span>}
                  </td>
                  <td className="mono msg-date">{formatDate(m.sent_at)}</td>
                  <td className="msg-actions">
                    <button className="icon-btn" onClick={e => toggleRead(m, e)} aria-label={isUnread ? 'Mark as read' : 'Mark as unread'}>
                      {isUnread ? <FaEnvelopeOpen /> : <FaEnvelope />}
                    </button>
                    <button className="icon-btn danger" onClick={e => handleDelete(m.id, e)} aria-label="Delete"><FaTrash /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {active && (
        <div className="ofc-drawer-scrim" onClick={close}>
          <aside className="ofc-drawer msg-drawer" onClick={e => e.stopPropagation()} aria-label="Message">
            <header className="ofc-drawer-head">
              <h3>{decodeHtml(active.subject)}</h3>
              <button type="button" className="icon-btn" onClick={close} aria-label="Close"><FaTimes /></button>
            </header>
            <div className="ofc-drawer-body">
              <div className="msg-from">
                <strong>{decodeHtml(active.full_name)}</strong>
                <a href={`mailto:${active.email}`}>{active.email}</a>
                <span className="mono">{formatDate(active.sent_at, FULL_DATE)}</span>
              </div>
              <div className="msg-body">{decodeHtml(active.message)}</div>

              {active.replied_at && (
                <div className="msg-sent-reply">
                  <span className="mono"><FaCheck /> You replied · {formatDate(active.replied_at, FULL_DATE)}</span>
                  <div>{active.reply_text}</div>
                </div>
              )}

              <form className="msg-reply" onSubmit={sendReply}>
                <label htmlFor="msg-reply" className="ofc-field-label"><FaReply /> {active.replied_at ? 'Send another reply' : 'Reply'}</label>
                <textarea
                  id="msg-reply" rows={7} value={reply} onChange={e => setReply(e.target.value)}
                  placeholder={`Write to ${decodeHtml(active.full_name).split(' ')[0]}…`}
                  disabled={!mailReady}
                />
                <p className="ofc-hint">Sent from the CAJDEN Gmail with their original message quoted below. Their answer comes back to that inbox.</p>
                <div className="msg-reply-actions">
                  <button type="button" className="ofc-delete" onClick={e => handleDelete(active.id, e)}><FaTrash /> Delete</button>
                  <button type="submit" className="btn btn-primary" disabled={sending || !reply.trim() || !mailReady}>
                    <FaPaperPlane /> {sending ? 'Sending…' : 'Send reply'}
                  </button>
                </div>
              </form>
            </div>
          </aside>
        </div>
      )}

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </div>
  );
}
