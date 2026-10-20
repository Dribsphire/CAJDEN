import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaArrowLeft, FaDownload, FaExternalLinkAlt } from 'react-icons/fa';
import api, { assetUrl } from '../api/axios';
import Hablon from '../components/Hablon.jsx';
import { issueNo } from '../components/IssueCover.jsx';
import { decodeHtml, formatBytes } from '../utils/format.js';
import './ENewsReader.css';

/**
 * Full-screen reader for one newsletter PDF (/e-news/:number/read).
 * Lives outside the site layout so the PDF gets the whole window.
 */
export default function ENewsReader() {
  const { number } = useParams();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/enews.php', { params: { number } })
      .then(res => setIssue(res.data.issue))
      .catch(() => setIssue(null))
      .finally(() => setLoading(false));
  }, [number]);

  useEffect(() => {
    if (issue) document.title = `CAJDEN E-News ${issueNo(issue.issue_number)}: ${decodeHtml(issue.title)}`;
    return () => { document.title = 'CAJDEN Inc. — Christian Advocates for Justice and Development in Negros'; };
  }, [issue]);

  const pdf = issue?.pdf_path ? assetUrl(issue.pdf_path) : null;

  return (
    <div className="reader">
      <Hablon height={8} />
      <header className="reader-bar">
        <Link to={`/e-news/${number}`} className="reader-back"><FaArrowLeft aria-hidden="true" /> <span>Back to issue</span></Link>
        <div className="reader-title">
          <span className="poster">{issue ? issueNo(issue.issue_number) : 'E-News'}</span>
          {issue && <span className="serif">{decodeHtml(issue.title)}</span>}
        </div>
        {pdf && (
          <div className="reader-actions">
            <a href={pdf} download className="btn btn-sun btn-sm">
              <FaDownload aria-hidden="true" /> <span>Download{issue.file_size ? ` · ${formatBytes(issue.file_size)}` : ''}</span>
            </a>
            <a href={pdf} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-light btn-sm" title="Open in a new tab">
              <FaExternalLinkAlt aria-hidden="true" /> <span>New tab</span>
            </a>
          </div>
        )}
      </header>

      <main className="reader-stage">
        {loading && <p className="reader-message">Loading…</p>}
        {!loading && !issue && (
          <div className="reader-message">
            <p>That issue could not be found.</p>
            <Link to="/e-news" className="btn btn-sun">All issues</Link>
          </div>
        )}
        {!loading && issue && !pdf && (
          <div className="reader-message">
            <p>This issue's PDF isn't available yet.</p>
            <Link to={`/e-news/${number}`} className="btn btn-sun">Back to issue</Link>
          </div>
        )}
        {pdf && (
          // Browsers show the PDF inline; phones that can't get the link inside instead.
          <object data={`${pdf}#view=FitH`} type="application/pdf" className="reader-frame" aria-label={`${issueNo(issue.issue_number)} PDF`}>
            <div className="reader-message">
              <p>Your browser can't show the newsletter here.</p>
              <a href={pdf} target="_blank" rel="noopener noreferrer" className="btn btn-sun">Open the PDF <FaExternalLinkAlt aria-hidden="true" /></a>
            </div>
          </object>
        )}
      </main>
    </div>
  );
}
