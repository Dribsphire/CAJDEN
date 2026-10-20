import { assetUrl } from '../api/axios';
import { decodeHtml, formatDate } from '../utils/format.js';
import './IssueCover.css';

const TILE_TINTS = ['tint-field', 'tint-red', 'tint-sky', 'tint-orange', 'tint-sun'];

export const issueNo = n => `No.${String(n || 0).padStart(2, '0')}`;

// "In this issue" is stored one story per line.
export const issueHighlights = text => decodeHtml(text || '').split('\n').map(l => l.trim()).filter(Boolean);

export const issuePeriod = issue =>
  decodeHtml(issue.period_label) || formatDate(issue.published_on, { month: 'short', year: 'numeric' });

const coverUrl = (issue, coverSrc) => (coverSrc !== undefined ? coverSrc : issue.cover_image ? assetUrl(issue.cover_image) : null);

/**
 * The newsletter's front cover. The uploaded image is the real printed cover
 * (with its own masthead, number and headline), so it is shown whole, at its
 * own proportions, and the issue details sit above it as a caption.
 * `coverSrc` overrides the stored image (admin preview).
 */
export function IssueCover({ issue, coverSrc, caption = true }) {
  const src = coverUrl(issue, coverSrc);
  return (
    <figure className="issue-cover">
      {caption && (
        <figcaption className="issue-cover-caption">
          <span className="mono">CAJDEN E-News · {issuePeriod(issue)}</span>
          <span className="poster">{issueNo(issue.issue_number)}</span>
          <span className="serif">{decodeHtml(issue.title) || 'Cover headline'}</span>
        </figcaption>
      )}
      {src ? (
        <img className="issue-cover-image" src={src} alt={`Cover of CAJDEN E-News ${issueNo(issue.issue_number)}`} />
      ) : (
        <span className="issue-cover-image issue-cover-empty" aria-hidden="true">
          <span className="poster">{issueNo(issue.issue_number)}</span>
        </span>
      )}
    </figure>
  );
}

/** Archive tile: label above, then the full cover (or a colour block when there's no cover). */
export function IssueTile({ issue, index = 0, coverSrc }) {
  const src = coverUrl(issue, coverSrc);
  return (
    <div className="enews-tile">
      <span className="enews-tile-label">
        <span className="poster">{issueNo(issue.issue_number)}</span>
        <span className="mono">{issuePeriod(issue)}</span>
      </span>
      {src ? (
        <img className="enews-tile-cover" src={src} alt="" loading="lazy" />
      ) : (
        <span className={`enews-tile-cover enews-tile-empty ${TILE_TINTS[index % TILE_TINTS.length]}`} aria-hidden="true">
          <span className="poster">{issueNo(issue.issue_number)}</span>
        </span>
      )}
    </div>
  );
}
