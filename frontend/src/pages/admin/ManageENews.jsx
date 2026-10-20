import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaFilePdf } from 'react-icons/fa';
import api, { assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { formatBytes, formatDate } from '../../utils/format.js';

const EMPTY = { id: null, issue_number: '', title: '', period_label: '', published_on: '', summary: '', highlights: '' };
const FIELDS = ['issue_number', 'title', 'period_label', 'published_on', 'summary', 'highlights'];

export default function ManageENews() {
  const [issues, setIssues] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [cover, setCover] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([api.get('/enews.php'), api.get('/enews_subscribe.php')])
      .then(([i, s]) => { setIssues(i.data.issues || []); setSubscribers(s.data.subscribers || []); })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() {
    const next = issues.length ? Math.max(...issues.map(i => Number(i.issue_number))) + 1 : 1;
    setForm({ ...EMPTY, issue_number: String(next) });
    setCover(null); setPdf(null); setModalOpen(true);
  }
  function openEdit(issue) {
    const f = { id: issue.id };
    FIELDS.forEach(k => { f[k] = issue[k] ?? ''; });
    setForm(f); setCover(null); setPdf(null); setModalOpen(true);
  }

  async function handleDelete(issue) {
    if (!confirm(`Delete Issue No. ${issue.issue_number}? The PDF will be removed too.`)) return;
    await api.delete(`/enews.php?id=${issue.id}`);
    setToast({ type: 'success', message: 'Issue deleted.' });
    load();
  }

  async function removeSubscriber(s) {
    if (!confirm(`Remove ${s.email} from the mailing list?`)) return;
    await api.delete(`/enews_subscribe.php?id=${s.id}`);
    load();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      FIELDS.forEach(k => fd.append(k, form[k] ?? ''));
      if (cover) fd.append('cover', cover);
      if (pdf) fd.append('pdf', pdf);
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (form.id) await api.post(`/enews.php?id=${form.id}&_method=PUT`, fd, cfg);
      else await api.post('/enews.php', fd, cfg);
      setToast({ type: 'success', message: `Issue ${form.id ? 'updated' : 'published'}.` });
      setModalOpen(false);
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save issue.' });
    } finally {
      setSaving(false);
    }
  }

  function copyEmails() {
    navigator.clipboard?.writeText(subscribers.map(s => s.email).join(', '))
      .then(() => setToast({ type: 'success', message: 'Subscriber emails copied.' }));
  }

  return (
    <>
      <div className="admin-page-header">
        <h2>E-News Issues</h2>
        <button className="btn btn-primary" onClick={openCreate}><FaPlus /> New Issue</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Cover</th><th>No.</th><th>Headline</th><th>Period</th><th>PDF</th><th>Actions</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6}>Loading…</td></tr>}
            {!loading && issues.length === 0 && <tr><td colSpan={6}>No issues yet. Publish the first one to fill the E-News page.</td></tr>}
            {issues.map(i => (
              <tr key={i.id}>
                <td>{i.cover_image ? <img className="admin-thumb" src={assetUrl(i.cover_image)} alt="" /> : <div className="admin-thumb" />}</td>
                <td><strong>{i.issue_number}</strong></td>
                <td>{i.title}</td>
                <td>{i.period_label || formatDate(i.published_on) || '—'}</td>
                <td>
                  {i.pdf_path
                    ? <a href={assetUrl(i.pdf_path)} target="_blank" rel="noreferrer"><FaFilePdf /> {formatBytes(i.file_size)}</a>
                    : <span style={{ color: 'var(--red)' }}>Missing</span>}
                </td>
                <td>
                  <button className="icon-btn" onClick={() => openEdit(i)} aria-label="Edit"><FaEdit /></button>
                  <button className="icon-btn danger" onClick={() => handleDelete(i)} aria-label="Delete"><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-page-header" style={{ marginTop: 40 }}>
        <h2>Subscribers ({subscribers.length})</h2>
        {subscribers.length > 0 && <button className="btn btn-outline btn-sm" onClick={copyEmails}>Copy all emails</button>}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Email</th><th>Subscribed</th><th></th></tr></thead>
          <tbody>
            {!loading && subscribers.length === 0 && <tr><td colSpan={3}>No subscribers yet. Visitors can sign up at the bottom of the E-News page.</td></tr>}
            {subscribers.map(s => (
              <tr key={s.id}>
                <td>{s.email}</td>
                <td>{formatDate(s.subscribed_at)}</td>
                <td><button className="icon-btn danger" onClick={() => removeSubscriber(s)} aria-label="Remove"><FaTrash /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => !saving && setModalOpen(false)}>
          <form className="modal-card" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <button type="button" className="icon-btn modal-close" onClick={() => setModalOpen(false)}><FaTimes /></button>
            <h3>{form.id ? `Edit Issue No. ${form.issue_number}` : 'New Issue'}</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16 }}>
              <div className="form-row">
                <label>Issue no.</label>
                <input type="number" min="1" value={form.issue_number} onChange={e => setForm({ ...form, issue_number: e.target.value })} required />
              </div>
              <div className="form-row">
                <label>Period label</label>
                <input value={form.period_label} onChange={e => setForm({ ...form, period_label: e.target.value })} placeholder="e.g. Q1 2026" />
              </div>
            </div>
            <div className="form-row">
              <label>Cover headline</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="form-row">
              <label>Publication date</label>
              <input type="date" value={form.published_on} onChange={e => setForm({ ...form, published_on: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Short summary</label>
              <textarea rows="3" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} />
            </div>
            <div className="form-row">
              <label>In this issue</label>
              <textarea rows="4" value={form.highlights} onChange={e => setForm({ ...form, highlights: e.target.value })} placeholder={'One story per line, e.g.\nFrom the director: twelve years in the barangays\nMothers lead the health census'} />
              <span className="hint">Shown as the table of contents for the latest issue.</span>
            </div>
            <div className="form-row">
              <label>Cover photo {form.id && '(leave blank to keep current)'}</label>
              <input type="file" accept="image/png, image/jpeg, image/webp" onChange={e => setCover(e.target.files[0])} />
            </div>
            <div className="form-row">
              <label>Newsletter PDF {form.id && '(leave blank to keep current)'}</label>
              <input type="file" accept="application/pdf" onChange={e => setPdf(e.target.files[0])} />
              <span className="hint">PDF up to 30MB.</span>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Issue'}</button>
            </div>
          </form>
        </div>
      )}

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
