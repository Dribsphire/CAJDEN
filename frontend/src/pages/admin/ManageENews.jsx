import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaPlus, FaTrash, FaEdit, FaExternalLinkAlt, FaFilePdf, FaSearch, FaDownload, FaCopy } from 'react-icons/fa';
import api, { API_BASE, assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { IssueTile } from '../../components/IssueCover.jsx';
import { decodeHtml, formatBytes, formatDate } from '../../utils/format.js';
import './ManageOfficers.css';
import './ManageENews.css';

function Issues({ issues, loading, onDelete }) {
  if (loading) return <div className="admin-loading">Loading…</div>;
  if (!issues.length) {
    return (
      <div className="svc-empty enews-empty">
        <p>No issues yet. Publish the first one to fill the E-News page.</p>
        <Link to="/admin/enews/new" className="btn btn-primary"><FaPlus /> Create issue No. 1</Link>
      </div>
    );
  }
  return (
    <ul className="enews-admin-grid">
      {issues.map((issue, i) => {
        const draft = !Number(issue.is_published);
        return (
          <li key={issue.id} className={`enews-admin-card ${draft ? 'is-draft' : ''}`}>
            <Link to={`/admin/enews/${issue.id}`} className="enews-admin-cover" aria-label={`Edit Issue No. ${issue.issue_number}`}>
              <IssueTile issue={issue} index={i} />
              {draft && <span className="svc-badge svc-badge-hidden enews-admin-flag">Draft</span>}
              {!draft && i === issues.findIndex(x => Number(x.is_published)) && <span className="svc-badge svc-badge-home enews-admin-flag">Latest</span>}
            </Link>
            <div className="enews-admin-body">
              <Link to={`/admin/enews/${issue.id}`} className="enews-admin-title serif">{decodeHtml(issue.title)}</Link>
              <span className="mono enews-admin-meta">
                {formatDate(issue.published_on) || 'No date'}
                {' · '}
                {issue.pdf_path
                  ? <a href={assetUrl(issue.pdf_path)} target="_blank" rel="noreferrer"><FaFilePdf /> {formatBytes(issue.file_size) || 'PDF'}</a>
                  : <span className="enews-admin-missing">No PDF</span>}
              </span>
            </div>
            <div className="enews-admin-actions">
              <Link to={`/admin/enews/${issue.id}`} className="icon-btn" aria-label="Edit"><FaEdit /></Link>
              {!draft && (
                <a className="icon-btn" href={`/e-news/${issue.issue_number}`} target="_blank" rel="noreferrer" aria-label="View on site"><FaExternalLinkAlt /></a>
              )}
              <button type="button" className="icon-btn danger" onClick={() => onDelete(issue)} aria-label="Delete"><FaTrash /></button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Subscribers({ subscribers, loading, onRemove, notify }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q ? subscribers.filter(s => s.email.toLowerCase().includes(q)) : subscribers;
  const thisMonth = subscribers.filter(s => (s.subscribed_at || '').slice(0, 7) === new Date().toISOString().slice(0, 7)).length;

  function copyAll() {
    navigator.clipboard?.writeText(subscribers.map(s => s.email).join(', '))
      .then(() => notify('success', `${subscribers.length} email addresses copied. Paste them into BCC.`));
  }

  if (loading) return <div className="admin-loading">Loading…</div>;
  return (
    <>
      <div className="fbpo-toolbar">
        <div className="ofc-summary">
          <span><strong>{subscribers.length}</strong> subscribers</span>
          <span><strong>{thisMonth}</strong> new this month</span>
        </div>
        {subscribers.length > 0 && (
          <div className="ofc-header-actions">
            <label className="search-field fbpo-search">
              <FaSearch aria-hidden="true" />
              <span className="sr-only">Search subscribers</span>
              <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search email…" />
            </label>
            <button type="button" className="btn btn-outline btn-sm" onClick={copyAll}><FaCopy /> Copy all</button>
            {/* A plain link download; the admin session cookie goes with it */}
            <a className="btn btn-outline btn-sm" href={`${API_BASE}/enews_subscribe.php?format=csv`}><FaDownload /> Export CSV</a>
          </div>
        )}
      </div>
      <p className="ofc-sub enews-sub-hint">
        People sign up at the bottom of the E-News page. When a new issue is out, send it from your email with these addresses in <strong>BCC</strong>, so subscribers can't see each other's emails.
      </p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Email</th><th>Subscribed</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={3}>{subscribers.length ? `No subscriber matches "${query}".` : 'No subscribers yet.'}</td></tr>
            )}
            {shown.map(s => (
              <tr key={s.id}>
                <td><a href={`mailto:${s.email}`}>{s.email}</a></td>
                <td>{formatDate(s.subscribed_at)}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="icon-btn danger" onClick={() => onRemove(s)} aria-label={`Remove ${s.email}`}><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function ManageENews() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'subscribers' ? 'subscribers' : 'issues';
  const [issues, setIssues] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const notify = (type, message) => setToast({ type, message });

  function load() {
    return Promise.all([api.get('/enews.php', { params: { all: 1 } }), api.get('/enews_subscribe.php')])
      .then(([i, s]) => { setIssues(i.data.issues || []); setSubscribers(s.data.subscribers || []); })
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function deleteIssue(issue) {
    if (!confirm(`Delete Issue No. ${issue.issue_number}? Its PDF and cover will be deleted too.`)) return;
    await api.delete(`/enews.php?id=${issue.id}`);
    notify('success', `Issue No. ${issue.issue_number} deleted.`);
    load();
  }

  async function removeSubscriber(s) {
    if (!confirm(`Remove ${s.email} from the mailing list?`)) return;
    await api.delete(`/enews_subscribe.php?id=${s.id}`);
    notify('success', 'Subscriber removed.');
    load();
  }

  const drafts = issues.filter(i => !Number(i.is_published)).length;

  return (
    <div className="enews-admin">
      <div className="admin-page-header">
        <div>
          <h2>E-News</h2>
          <p className="ofc-sub">The newsletter archive on the E-News page, newest issue first.</p>
        </div>
        <div className="ofc-header-actions">
          <a className="btn btn-outline btn-sm" href="/e-news" target="_blank" rel="noreferrer">View page <FaExternalLinkAlt /></a>
          <Link to="/admin/enews/new" className="btn btn-primary"><FaPlus /> New issue</Link>
        </div>
      </div>

      <div className="enews-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'issues'} className={tab === 'issues' ? 'is-on' : ''} onClick={() => setParams({})}>
          Issues <span>{issues.length}{drafts ? ` · ${drafts} draft${drafts === 1 ? '' : 's'}` : ''}</span>
        </button>
        <button role="tab" aria-selected={tab === 'subscribers'} className={tab === 'subscribers' ? 'is-on' : ''} onClick={() => setParams({ tab: 'subscribers' })}>
          Subscribers <span>{subscribers.length}</span>
        </button>
      </div>

      {tab === 'issues'
        ? <Issues issues={issues} loading={loading} onDelete={deleteIssue} />
        : <Subscribers subscribers={subscribers} loading={loading} onRemove={removeSubscriber} notify={notify} />}

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </div>
  );
}
