import { useEffect, useState } from 'react';
import { FaArrowRight, FaDownload } from 'react-icons/fa';
import api, { assetUrl } from '../api/axios';
import PageHeader from '../components/PageHeader.jsx';
import { decodeHtml, formatBytes, formatDate } from '../utils/format.js';
import './ENews.css';

const COVER_TINTS = ['tint-field', 'tint-red', 'tint-sky', 'tint-orange', 'tint-sun'];

function issueNo(n) {
  return `No.${String(n).padStart(2, '0')}`;
}

function IssueCover({ issue }) {
  return (
    <div className="issue-cover">
      <div className="issue-cover-mast">
        <span className="poster">CAJDEN E-News</span>
        <span className="mono">{issue.period_label || formatDate(issue.published_on, { month: 'short', year: 'numeric' })}</span>
      </div>
      <span className="poster issue-cover-no">{issueNo(issue.issue_number)}</span>
      {issue.cover_image && <img src={assetUrl(issue.cover_image)} alt="" />}
      <span className="serif issue-cover-headline">{issue.title}</span>
    </div>
  );
}

function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null); // { type, message }
  const [sending, setSending] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await api.post('/enews_subscribe.php', { email });
      setStatus({ type: 'ok', message: res.data.message });
      setEmail('');
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Something went wrong. Please try again.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="enews-subscribe on-dark">
      <div className="container enews-subscribe-inner">
        <div>
          <h2 className="poster">Get it in your inbox.</h2>
          <p className="serif">New issues straight to your email. No spam, just the barangays.</p>
        </div>
        <form className="enews-subscribe-form" onSubmit={submit} noValidate>
          <label htmlFor="enews-email" className="sr-only">Email address</label>
          <div className="enews-subscribe-row">
            <input
              id="enews-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button className="btn btn-sun" disabled={sending}>
              {sending ? 'Sending…' : <>Subscribe <FaArrowRight aria-hidden="true" /></>}
            </button>
          </div>
          {status && <p className={`enews-subscribe-status ${status.type}`} role="status">{status.message}</p>}
        </form>
      </div>
    </section>
  );
}

export default function ENews() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/enews.php')
      .then(res => setIssues(res.data.issues || []))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, []);

  const [latest, ...past] = issues;
  const highlights = (latest?.highlights || '').split('\n').map(l => l.trim()).filter(Boolean);

  return (
    <>
      <PageHeader
        title="E-News"
        lede="Our newsletter: what happened in the barangays this season, in our own words."
        crumbs={[{ label: 'Resources' }, { label: 'E-News' }]}
      />

      <section className="section">
        <div className="container">
          {loading && <div className="skeleton" style={{ height: 520 }} />}
          {!loading && !latest && <p className="empty-note">The first issue of CAJDEN E-News is on its way. Subscribe below to get it first.</p>}

          {latest && (
            <article className="enews-latest">
              <IssueCover issue={latest} />
              <div className="enews-latest-info">
                <span className="label">
                  Latest issue{latest.published_on ? ` · ${formatDate(latest.published_on, { month: 'long', year: 'numeric' })}` : ''}
                </span>
                <h2 className="poster">Issue No. {latest.issue_number}</h2>
                {latest.summary && <p className="enews-summary">{decodeHtml(latest.summary)}</p>}
                {highlights.length > 0 && (
                  <ol className="enews-toc">
                    {highlights.map((line, i) => (
                      <li key={i}>
                        <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                        <span className="serif">{line}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {latest.pdf_path && (
                  <div className="enews-actions">
                    <a href={assetUrl(latest.pdf_path)} target="_blank" rel="noopener noreferrer" className="btn btn-sun">
                      Read online <FaArrowRight aria-hidden="true" />
                    </a>
                    <a href={assetUrl(latest.pdf_path)} download className="btn">
                      <FaDownload aria-hidden="true" /> PDF{latest.file_size ? ` · ${formatBytes(latest.file_size)}` : ''}
                    </a>
                  </div>
                )}
              </div>
            </article>
          )}

          {past.length > 0 && (
            <div className="enews-archive">
              <div className="grid-head">
                <h2 className="poster">Past issues</h2>
                <span className="mono">{past.length} issue{past.length === 1 ? '' : 's'}</span>
              </div>
              <div className="enews-archive-grid">
                {past.map((issue, i) => {
                  const Tag = issue.pdf_path ? 'a' : 'div';
                  const linkProps = issue.pdf_path ? { href: assetUrl(issue.pdf_path), target: '_blank', rel: 'noopener noreferrer' } : {};
                  return (
                    <Tag className="enews-past" key={issue.id} {...linkProps}>
                      <div className={`enews-past-cover ${COVER_TINTS[i % COVER_TINTS.length]}`}>
                        <span className="mono">{issue.period_label || formatDate(issue.published_on, { month: 'short', year: 'numeric' })}</span>
                        <span className="poster">{issueNo(issue.issue_number)}</span>
                      </div>
                      <span className="serif enews-past-title">{issue.title}</span>
                      {issue.pdf_path && <span className="mono enews-past-file">PDF{issue.file_size ? ` · ${formatBytes(issue.file_size)}` : ''}</span>}
                    </Tag>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <SubscribeForm />
    </>
  );
}
