import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaTrash, FaEdit, FaExternalLinkAlt, FaSearch, FaStar, FaEyeSlash, FaImages } from 'react-icons/fa';
import api, { assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { decodeHtml, formatDate } from '../../utils/format.js';
import './ManageOfficers.css';
import './ManageAlbums.css';

export default function ManageAlbums() {
  const [albums, setAlbums] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [toast, setToast] = useState(null);

  function load() {
    return api.get('/albums.php', { params: { all: 1 } })
      .then(res => { setAlbums(res.data.albums || []); setCategories(res.data.categories || []); })
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleDelete(a) {
    if (!confirm(`Delete "${decodeHtml(a.title)}" and all ${a.photo_count} photos? This cannot be undone.`)) return;
    await api.delete(`/albums.php?id=${a.id}`);
    setToast({ type: 'success', message: 'Album deleted.' });
    load();
  }

  const q = query.trim().toLowerCase();
  const shown = albums.filter(a =>
    (!category || a.category === category) &&
    (!q || decodeHtml(a.title).toLowerCase().includes(q) || (a.category || '').toLowerCase().includes(q)));
  const totalPhotos = albums.reduce((n, a) => n + Number(a.photo_count || 0), 0);
  const hidden = albums.filter(a => !Number(a.is_published)).length;

  return (
    <div className="alb">
      <div className="admin-page-header">
        <div>
          <h2>Photo Albums</h2>
          <p className="ofc-sub">Albums on the Photos page, newest activity first. The featured album is shown large at the top.</p>
        </div>
        <div className="ofc-header-actions">
          <a className="btn btn-outline btn-sm" href="/photos" target="_blank" rel="noreferrer">View page <FaExternalLinkAlt /></a>
          <Link to="/admin/albums/new" className="btn btn-primary"><FaPlus /> New album</Link>
        </div>
      </div>

      {!loading && albums.length > 0 && (
        <div className="alb-toolbar">
          <div className="ofc-summary">
            <span><strong>{albums.length}</strong> albums</span>
            <span><strong>{totalPhotos}</strong> photos</span>
            {hidden > 0 && <span><strong>{hidden}</strong> hidden</span>}
          </div>
          <div className="alb-filters">
            {categories.length > 1 && (
              <div className="chips" role="group" aria-label="Filter by category">
                <button className={`chip ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>All</button>
                {categories.map(c => (
                  <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
                ))}
              </div>
            )}
            <label className="search-field alb-search">
              <FaSearch aria-hidden="true" />
              <span className="sr-only">Search albums</span>
              <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search albums…" />
            </label>
          </div>
        </div>
      )}

      {loading && <div className="admin-loading">Loading…</div>}
      {!loading && albums.length === 0 && (
        <div className="alb-empty">
          <FaImages />
          <p>No albums yet. Create one and drop in photos from your last activity.</p>
          <Link to="/admin/albums/new" className="btn btn-primary"><FaPlus /> Create the first album</Link>
        </div>
      )}
      {!loading && albums.length > 0 && shown.length === 0 && <p className="ofc-empty">No album matches that search.</p>}

      <ul className="alb-grid">
        {shown.map(a => {
          const published = Number(a.is_published) === 1;
          return (
            <li key={a.id} className={`alb-card ${published ? '' : 'is-hidden'}`}>
              <Link to={`/admin/albums/${a.id}`} className="alb-card-cover" aria-label={`Edit ${decodeHtml(a.title)}`}>
                {a.cover_path
                  ? <img src={assetUrl(a.cover_path)} alt="" loading="lazy" />
                  : <span className="alb-card-nocover"><FaImages /> No photos yet</span>}
                <span className="alb-card-count mono">{a.photo_count} photo{Number(a.photo_count) === 1 ? '' : 's'}</span>
                <span className="alb-card-flags">
                  {Number(a.is_featured) === 1 && <span className="svc-badge alb-badge-featured"><FaStar /> Featured</span>}
                  {!published && <span className="svc-badge alb-badge-hidden"><FaEyeSlash /> Hidden</span>}
                </span>
              </Link>
              <div className="alb-card-body">
                <span className="mono alb-card-meta">{[a.category, formatDate(a.event_date || a.created_at)].filter(Boolean).join(' · ')}</span>
                <Link to={`/admin/albums/${a.id}`} className="alb-card-title serif">{decodeHtml(a.title)}</Link>
              </div>
              <div className="enews-admin-actions alb-card-actions">
                <Link to={`/admin/albums/${a.id}`} className="icon-btn" aria-label="Edit"><FaEdit /></Link>
                {published && <a className="icon-btn" href={`/photos/${a.id}`} target="_blank" rel="noreferrer" aria-label="View on site"><FaExternalLinkAlt /></a>}
                <button type="button" className="icon-btn danger" onClick={() => handleDelete(a)} aria-label="Delete"><FaTrash /></button>
              </div>
            </li>
          );
        })}
      </ul>

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </div>
  );
}
