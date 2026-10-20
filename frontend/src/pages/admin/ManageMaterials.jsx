import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaExternalLinkAlt, FaSearch, FaStar, FaEyeSlash, FaDownload, FaLink, FaFileAlt } from 'react-icons/fa';
import api from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { MATERIAL_TYPES, materialTypeLabel, materialFormat, materialHref, isLinkMaterial } from '../../constants/materials.js';
import { decodeHtml, formatBytes } from '../../utils/format.js';
import './ManageOfficers.css';
import './ManageMaterials.css';

export default function ManageMaterials() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState(null);

  function load() {
    return api.get('/materials.php', { params: { all: 1 } })
      .then(res => setItems(res.data.materials || []))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleDelete(m) {
    if (!confirm(`Delete "${decodeHtml(m.title)}"? ${isLinkMaterial(m) ? '' : 'The file will be deleted too. '}This cannot be undone.`)) return;
    await api.delete(`/materials.php?id=${m.id}`);
    setToast({ type: 'success', message: 'Material deleted.' });
    load();
  }

  const q = query.trim().toLowerCase();
  const shown = items.filter(m =>
    (!type || m.type === type) &&
    (!q || [m.title, m.description, m.language].some(v => decodeHtml(v || '').toLowerCase().includes(q))));
  const downloads = items.reduce((n, m) => n + Number(m.download_count || 0), 0);
  const hidden = items.filter(m => !Number(m.is_published)).length;
  const typesInUse = MATERIAL_TYPES.filter(t => items.some(m => m.type === t.value));

  return (
    <div className="mat">
      <div className="admin-page-header">
        <div>
          <h2>Materials</h2>
          <p className="ofc-sub">Modules, reports, posters and policies people can download from the Materials page. Featured items are shown large at the top.</p>
        </div>
        <div className="ofc-header-actions">
          <a className="btn btn-outline btn-sm" href="/materials" target="_blank" rel="noreferrer">View page <FaExternalLinkAlt /></a>
          <Link to="/admin/materials/new" className="btn btn-primary"><FaPlus /> New material</Link>
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div className="alb-toolbar">
          <div className="ofc-summary">
            <span><strong>{items.length}</strong> materials</span>
            <span><strong>{downloads}</strong> downloads</span>
            {hidden > 0 && <span><strong>{hidden}</strong> hidden</span>}
          </div>
          <div className="alb-filters">
            {typesInUse.length > 1 && (
              <div className="chips" role="group" aria-label="Filter by type">
                <button className={`chip ${!type ? 'active' : ''}`} onClick={() => setType('')}>All</button>
                {typesInUse.map(t => (
                  <button key={t.value} className={`chip ${type === t.value ? 'active' : ''}`} onClick={() => setType(t.value)}>{t.plural}</button>
                ))}
              </div>
            )}
            <label className="search-field alb-search">
              <FaSearch aria-hidden="true" />
              <span className="sr-only">Search materials</span>
              <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search materials…" />
            </label>
          </div>
        </div>
      )}

      {loading && <div className="admin-loading">Loading…</div>}
      {!loading && items.length === 0 && (
        <div className="alb-empty">
          <FaFileAlt />
          <p>No materials yet. Upload a module, report or poster, or link to one on Google Drive.</p>
          <Link to="/admin/materials/new" className="btn btn-primary"><FaPlus /> Add the first material</Link>
        </div>
      )}
      {!loading && items.length > 0 && shown.length === 0 && <p className="ofc-empty">No material matches that filter.</p>}

      {shown.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table mat-table">
            <thead>
              <tr><th>Material</th><th>Type</th><th>Language</th><th>Year</th><th>File</th><th>Downloads</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {shown.map(m => {
                const published = Number(m.is_published) === 1;
                return (
                  <tr key={m.id} className={published ? '' : 'is-hidden'}>
                    <td>
                      <Link to={`/admin/materials/${m.id}`} className="mat-title">
                        <strong className="serif">{decodeHtml(m.title)}</strong>
                        <span className="mat-flags">
                          {Number(m.is_featured) === 1 && <span className="svc-badge alb-badge-featured"><FaStar /> Featured</span>}
                          {!published && <span className="svc-badge alb-badge-hidden"><FaEyeSlash /> Hidden</span>}
                        </span>
                      </Link>
                    </td>
                    <td><span className={`label material-type material-type-${m.type}`}>{materialTypeLabel(m.type)}</span></td>
                    <td>{decodeHtml(m.language) || '—'}</td>
                    <td className="mono">{m.year || '—'}</td>
                    <td className="mono mat-format">
                      {isLinkMaterial(m) ? <><FaLink /> {materialFormat(m)}</> : <>{materialFormat(m)} · {formatBytes(m.file_size)}</>}
                    </td>
                    <td className="mono">{Number(m.download_count || 0)}</td>
                    <td className="mat-actions">
                      <Link to={`/admin/materials/${m.id}`} className="icon-btn" aria-label="Edit"><FaEdit /></Link>
                      <a className="icon-btn" href={materialHref(m)} target="_blank" rel="noreferrer" aria-label="Open file"><FaDownload /></a>
                      <button type="button" className="icon-btn danger" onClick={() => handleDelete(m)} aria-label="Delete"><FaTrash /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </div>
  );
}
