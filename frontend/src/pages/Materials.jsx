import { useEffect, useState } from 'react';
import { FaSearch, FaDownload } from 'react-icons/fa';
import api, { assetUrl } from '../api/axios';
import PageHeader from '../components/PageHeader.jsx';
import { decodeHtml, fileExtension, formatBytes } from '../utils/format.js';
import logo from '../assets/logo/cajden-seal-256.png';
import { MATERIAL_TYPES } from '../constants/materials.js';
import './Materials.css';

const typeLabel = value => MATERIAL_TYPES.find(t => t.value === value)?.label || value;

function FeaturedMaterial({ item, primary }) {
  const href = assetUrl(item.file_path);
  if (primary) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="material-feature material-feature-primary">
        <div className="material-feature-spine">
          <span className="mono">{typeLabel(item.type)}</span>
          <span className="poster">{item.year || fileExtension(item.file_path)}</span>
          <img src={logo} alt="" />
        </div>
        <div className="material-feature-body">
          <span className="label">Featured</span>
          <h2 className="serif">{item.title}</h2>
          {item.description && <p>{decodeHtml(item.description)}</p>}
          <span className="btn btn-sun btn-sm material-feature-btn">
            <FaDownload aria-hidden="true" /> {fileExtension(item.file_path)}{item.file_size ? ` · ${formatBytes(item.file_size)}` : ''}
          </span>
        </div>
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="material-feature material-feature-secondary">
      <span className="mono">{typeLabel(item.type)}</span>
      <h2 className="serif">{item.title}</h2>
      {item.language && (
        <div className="chips">{item.language.split(',').map(l => <span className="chip" key={l}>{l.trim()}</span>)}</div>
      )}
    </a>
  );
}

export default function Materials() {
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    api.get('/materials.php', { params: { type: type || undefined, search: debounced || undefined } })
      .then(res => setItems(res.data.materials || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [type, debounced]);

  const browsing = !type && !debounced;
  const featured = browsing ? items.filter(m => Number(m.is_featured)).slice(0, 2) : [];

  return (
    <>
      <PageHeader
        title="Materials"
        size="lg"
        lede="Training modules, reports, and IEC materials, free for parishes, schools, and partner organizations to use."
        crumbs={[{ label: 'Resources' }, { label: 'Materials' }]}
      />

      <section className="section">
        <div className="container">
          {featured.length > 0 && (
            <div className={`materials-featured ${featured.length === 1 ? 'single' : ''}`}>
              {featured.map((m, i) => <FeaturedMaterial item={m} primary={i === 0} key={m.id} />)}
            </div>
          )}

          <div className="materials-controls">
            <div className="chips" role="group" aria-label="Filter by type">
              <button className={`chip ${!type ? 'active' : ''}`} onClick={() => setType('')}>All</button>
              {MATERIAL_TYPES.filter(t => t.value !== 'other').map(t => (
                <button key={t.value} className={`chip ${type === t.value ? 'active' : ''}`} onClick={() => setType(t.value)}>{t.plural}</button>
              ))}
            </div>
            <label className="search-field">
              <FaSearch aria-hidden="true" />
              <span className="sr-only">Search materials</span>
              <input type="search" placeholder="Search materials…" value={search} onChange={e => setSearch(e.target.value)} />
            </label>
          </div>

          {loading && <div className="skeleton" style={{ height: 320 }} />}

          {!loading && items.length === 0 && (
            <p className="empty-note">
              {browsing ? 'Downloadable modules and reports will be published here soon.' : 'Nothing matches that search yet.'}
            </p>
          )}

          {!loading && items.length > 0 && (
            <table className="materials-table">
              <thead className="mono">
                <tr><th>Type</th><th>Title</th><th>Language</th><th>Year</th><th>Size</th><th><span className="sr-only">Download</span></th></tr>
              </thead>
              <tbody>
                {items.map(m => (
                  <tr key={m.id}>
                    <td data-label="Type"><span className={`label material-type material-type-${m.type}`}>{typeLabel(m.type)}</span></td>
                    <td data-label="Title" className="materials-title">
                      <strong className="serif">{m.title}</strong>
                      {m.description && <span>{decodeHtml(m.description)}</span>}
                    </td>
                    <td data-label="Language">{m.language || '—'}</td>
                    <td data-label="Year" className="mono">{m.year || '—'}</td>
                    <td data-label="Size" className="mono">{formatBytes(m.file_size) || fileExtension(m.file_path)}</td>
                    <td>
                      <a href={assetUrl(m.file_path)} target="_blank" rel="noopener noreferrer" className="materials-download poster">
                        Download <FaDownload aria-hidden="true" />
                        <span className="sr-only"> {m.title}</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
