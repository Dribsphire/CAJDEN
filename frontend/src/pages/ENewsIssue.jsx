import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaArrowLeft, FaArrowRight, FaBookOpen, FaDownload, FaFacebook, FaLink } from 'react-icons/fa';
import api, { assetUrl } from '../api/axios';
import PageHeader from '../components/PageHeader.jsx';
import { IssueCover, issueHighlights, issueNo, issuePeriod } from '../components/IssueCover.jsx';
import { SubscribeForm } from './ENews.jsx';
import { decodeHtml, formatBytes, formatDate } from '../utils/format.js';
import './ENews.css';

export default function ENewsIssue() {
  const { number } = useParams();
  const [issue, setIssue] = useState(null);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([api.get('/enews.php', { params: { number } }), api.get('/enews.php')])
      .then(([one, list]) => {
        setIssue(one.status === 'fulfilled' ? one.value.data.issue : null);
        setAll(list.status === 'fulfilled' ? list.value.data.issues || [] : []);
      })
      .finally(() => setLoading(false));
  }, [number]);

  if (loading) return <div className="container section"><div className="skeleton" style={{ height: 520 }} /></div>;
  if (!issue) {
    return (
      <div className="container section">
        <p className="empty-note">That issue could not be found.</p>
        <p style={{ marginTop: 28 }}><Link to="/e-news" className="btn"><FaArrowLeft aria-hidden="true" /> All issues</Link></p>
      </div>
    );
  }

  // Issues are listed newest first, so "newer" is the previous entry.
  const index = all.findIndex(i => i.id === issue.id);
  const newer = index > 0 ? all[index - 1] : null;
  const older = index >= 0 && index < all.length - 1 ? all[index + 1] : null;
  const highlights = issueHighlights(issue.highlights);
  const pdf = issue.pdf_path ? assetUrl(issue.pdf_path) : null;
  const pageUrl = window.location.href.split('#')[0];

  function copyLink() {
    navigator.clipboard?.writeText(pageUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <>
      {!Number(issue.is_published) && (
        <div className="post-preview-banner mono" role="status">Draft preview: only admins can see this issue.</div>
      )}
      <PageHeader
        title={issueNo(issue.issue_number)}
        lede={decodeHtml(issue.title)}
        crumbs={[{ label: 'Resources' }, { label: 'E-News', to: '/e-news' }, { label: `Issue No. ${issue.issue_number}` }]}
      />

      <section className="section">
        <div className="container">
          <article className="enews-latest enews-issue">
            {/* The page header above already shows the number and headline */}
            <IssueCover issue={issue} caption={false} />
            <div className="enews-latest-info">
              <span className="label">{[issuePeriod(issue), formatDate(issue.published_on, { month: 'long', day: 'numeric', year: 'numeric' })].filter(Boolean).join(' · ')}</span>
              {issue.summary && <p className="enews-summary">{decodeHtml(issue.summary)}</p>}
              {highlights.length > 0 && (
                <>
                  <span className="mono enews-toc-label">In this issue</span>
                  <ol className="enews-toc">
                    {highlights.map((line, i) => (
                      <li key={i}><span className="mono">{String(i + 1).padStart(2, '0')}</span><span className="serif">{line}</span></li>
                    ))}
                  </ol>
                </>
              )}
              <div className="enews-actions">
                {pdf && (
                  <>
                    {/* The PDF opens on its own full-screen page, keeping this page's layout intact */}
                    <Link to={`/e-news/${issue.issue_number}/read`} className="btn btn-sun">
                      <FaBookOpen aria-hidden="true" /> Read online
                    </Link>
                    <a href={pdf} download className="btn">
                      <FaDownload aria-hidden="true" /> PDF{issue.file_size ? ` · ${formatBytes(issue.file_size)}` : ''}
                    </a>
                  </>
                )}
                <button type="button" className="btn" onClick={copyLink}><FaLink aria-hidden="true" /> {copied ? 'Link copied' : 'Copy link'}</button>
                <a className="btn" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`} target="_blank" rel="noopener noreferrer">
                  <FaFacebook aria-hidden="true" /> Share
                </a>
              </div>
            </div>
          </article>

          {(older || newer) && <nav className="enews-issue-nav" aria-label="Other issues">
            {older ? (
              <Link to={`/e-news/${older.issue_number}`} className="enews-issue-nav-link">
                <FaArrowLeft aria-hidden="true" />
                <span><span className="mono">Older</span><strong className="serif">Issue No. {older.issue_number}: {decodeHtml(older.title)}</strong></span>
              </Link>
            ) : <span />}
            {newer && (
              <Link to={`/e-news/${newer.issue_number}`} className="enews-issue-nav-link is-next">
                <span><span className="mono">Newer</span><strong className="serif">Issue No. {newer.issue_number}: {decodeHtml(newer.title)}</strong></span>
                <FaArrowRight aria-hidden="true" />
              </Link>
            )}
          </nav>}
        </div>
      </section>

      <SubscribeForm />
    </>
  );
}
