import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaDownload } from 'react-icons/fa';
import api, { assetUrl } from '../api/axios';
import PageHeader from '../components/PageHeader.jsx';
import { IssueCover, IssueTile, issueHighlights } from '../components/IssueCover.jsx';
import { decodeHtml, formatBytes, formatDate } from '../utils/format.js';
import './ENews.css';

export function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot: hidden from people, filled by bots
  const [status, setStatus] = useState(null); // { type, message }
  const [sending, setSending] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await api.post('/enews_subscribe.php', { email, website });
      setStatus({ type: 'ok', message: res.data.message });
      setEmail('');
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Something went wrong. Please try again.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="enews-subscribe on-dark" id="subscribe">
      <div className="container enews-subscribe-inner">
        <div>
          <h2 className="poster">Get it in your inbox.</h2>
          <p className="serif">New issues straight to your email. No spam, just stories from our communities.</p>
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
              autoComplete="email"
            />
            <button className="btn btn-sun" disabled={sending}>
              {sending ? 'Sending…' : <>Subscribe <FaArrowRight aria-hidden="true" /></>}
            </button>
          </div>
          <div className="enews-hp" aria-hidden="true">
            <label htmlFor="enews-website">Leave this empty</label>
            <input id="enews-website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
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
  const [year, setYear] = useState('');

  useEffect(() => {
    api.get('/enews.php')
      .then(res => setIssues(res.data.issues || []))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, []);

  const [latest, ...past] = issues;
  const highlights = issueHighlights(latest?.highlights);
  const years = [...new Set(past.map(i => (i.published_on || '').slice(0, 4)).filter(Boolean))];
  const shownPast = year ? past.filter(i => (i.published_on || '').startsWith(year)) : past;

  return (
    <>
      <PageHeader
        title="E-News"
        lede="Our newsletter: what happened in our communities this season, in our own words."
        crumbs={[{ label: 'Resources' }, { label: 'E-News' }]}
      />

      <section className="section">
        <div className="container">
          {loading && <div className="skeleton" style={{ height: 520 }} />}
          {!loading && !latest && (
            <p className="empty-note">
              The first issue of CAJDEN E-News is on its way. <a href="#subscribe">Subscribe below</a> to get it first.
            </p>
          )}

          {latest && (
            <article className="enews-latest">
              <Link to={`/e-news/${latest.issue_number}`} className="enews-latest-cover" aria-label={`Read Issue No. ${latest.issue_number}`}>
                <IssueCover issue={latest} />
              </Link>
              <div className="enews-latest-info">
                <span className="label">
                  Latest issue{latest.published_on ? ` · ${formatDate(latest.published_on, { month: 'long', year: 'numeric' })}` : ''}
                </span>
                {latest.summary && <p className="enews-summary">{decodeHtml(latest.summary)}</p>}
                {highlights.length > 0 && (
                  <>
                    <span className="mono enews-toc-label">In this issue</span>
                    <ol className="enews-toc">
                      {highlights.map((line, i) => (
                        <li key={i}>
                          <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                          <span className="serif">{line}</span>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                <div className="enews-actions">
                  {latest.pdf_path && (
                    <Link to={`/e-news/${latest.issue_number}/read`} className="btn btn-sun">
                      Read this issue <FaArrowRight aria-hidden="true" />
                    </Link>
                  )}
                  <Link to={`/e-news/${latest.issue_number}`} className="btn">Issue details</Link>
                  {latest.pdf_path && (
                    <a href={assetUrl(latest.pdf_path)} download className="btn">
                      <FaDownload aria-hidden="true" /> PDF{latest.file_size ? ` · ${formatBytes(latest.file_size)}` : ''}
                    </a>
                  )}
                </div>
              </div>
            </article>
          )}

          {past.length > 0 && (
            <div className="enews-archive">
              <div className="grid-head">
                <h2 className="poster">Past issues</h2>
                {years.length > 1 ? (
                  <div className="chips" role="group" aria-label="Filter by year">
                    <button className={`chip ${!year ? 'active' : ''}`} onClick={() => setYear('')}>All</button>
                    {years.map(y => (
                      <button key={y} className={`chip ${year === y ? 'active' : ''}`} onClick={() => setYear(y)}>{y}</button>
                    ))}
                  </div>
                ) : (
                  <span className="mono">{past.length} issue{past.length === 1 ? '' : 's'}</span>
                )}
              </div>
              <div className="enews-archive-grid">
                {shownPast.map((issue, i) => (
                  <Link className="enews-past" key={issue.id} to={`/e-news/${issue.issue_number}`}>
                    <IssueTile issue={issue} index={i} />
                    <span className="serif enews-past-title">{decodeHtml(issue.title)}</span>
                    {issue.pdf_path && <span className="mono enews-past-file">PDF{issue.file_size ? ` · ${formatBytes(issue.file_size)}` : ''}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <SubscribeForm />
    </>
  );
}
