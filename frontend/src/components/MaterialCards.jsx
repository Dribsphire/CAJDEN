import { FaDownload, FaExternalLinkAlt, FaLink } from 'react-icons/fa';
import { assetUrl } from '../api/axios';
import { decodeHtml, formatBytes } from '../utils/format.js';
import { materialTypeLabel, materialFormat, materialHref, isLinkMaterial } from '../constants/materials.js';
import logo from '../assets/logo/cajden-seal-256.png';
import './MaterialCards.css';

const languages = m => decodeHtml(m.language || '').split(',').map(l => l.trim()).filter(Boolean);

function actionLabel(m) {
  if (isLinkMaterial(m)) return <><FaExternalLinkAlt aria-hidden="true" /> Open {materialFormat(m)}</>;
  return <><FaDownload aria-hidden="true" /> {materialFormat(m)}{m.file_size ? ` · ${formatBytes(m.file_size)}` : ''}</>;
}

/**
 * Large card for featured materials. `preview` renders a non-link version
 * (admin editor) and `coverSrc` overrides the stored cover image.
 */
export function FeaturedMaterial({ item, primary, preview = false, coverSrc }) {
  const cover = coverSrc !== undefined ? coverSrc : (item.cover_image ? assetUrl(item.cover_image) : null);
  const Tag = preview ? 'div' : 'a';
  const linkProps = preview ? {} : { href: materialHref(item), target: '_blank', rel: 'noopener noreferrer' };
  const title = decodeHtml(item.title) || 'Material title';

  if (primary) {
    return (
      <Tag className="material-feature material-feature-primary" {...linkProps}>
        {cover ? (
          <div className="material-feature-spine has-cover"><img src={cover} alt="" /></div>
        ) : (
          <div className="material-feature-spine">
            <span className="mono">{materialTypeLabel(item.type)}</span>
            <span className="poster">{item.year || materialFormat(item)}</span>
            <img src={logo} alt="" />
          </div>
        )}
        <div className="material-feature-body">
          <span className="label">Featured · {materialTypeLabel(item.type)}</span>
          <h2 className="serif">{title}</h2>
          {item.description && <p>{decodeHtml(item.description)}</p>}
          <span className="btn btn-sun btn-sm material-feature-btn">{actionLabel(item)}</span>
        </div>
      </Tag>
    );
  }
  return (
    <Tag className="material-feature material-feature-secondary" {...linkProps}>
      {cover && <img className="material-feature-thumb" src={cover} alt="" />}
      <span className="mono">{materialTypeLabel(item.type)}</span>
      <h2 className="serif">{title}</h2>
      {languages(item).length > 0 && (
        <div className="chips">{languages(item).map(l => <span className="chip" key={l}>{l}</span>)}</div>
      )}
    </Tag>
  );
}

/** One row of the public materials table. */
export function MaterialRow({ item, preview = false }) {
  const link = isLinkMaterial(item);
  return (
    <tr>
      <td data-label="Type"><span className={`label material-type material-type-${item.type}`}>{materialTypeLabel(item.type)}</span></td>
      <td data-label="Title" className="materials-title">
        <strong className="serif">{decodeHtml(item.title) || 'Material title'}</strong>
        {item.description && <span>{decodeHtml(item.description)}</span>}
      </td>
      <td data-label="Language">{languages(item).join(', ') || '—'}</td>
      <td data-label="Year" className="mono">{item.year || '—'}</td>
      <td data-label="Size" className="mono">{link ? <><FaLink aria-hidden="true" /> {materialFormat(item)}</> : (formatBytes(item.file_size) || materialFormat(item))}</td>
      <td>
        {preview ? (
          <span className="materials-download poster">{link ? 'Open' : 'Download'} {link ? <FaExternalLinkAlt aria-hidden="true" /> : <FaDownload aria-hidden="true" />}</span>
        ) : (
          <a href={materialHref(item)} target="_blank" rel="noopener noreferrer" className="materials-download poster">
            {link ? 'Open' : 'Download'} {link ? <FaExternalLinkAlt aria-hidden="true" /> : <FaDownload aria-hidden="true" />}
            <span className="sr-only"> {decodeHtml(item.title)}</span>
          </a>
        )}
      </td>
    </tr>
  );
}
