import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaArrowUp, FaArrowDown, FaGripVertical, FaExternalLinkAlt, FaHome, FaEyeSlash } from 'react-icons/fa';
import api, { assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { decodeHtml } from '../../utils/format.js';
import { plainText } from '../../utils/postContent.js';
import './ManageServices.css';

export const HOMEPAGE_COUNT = 4; // Home.jsx shows the first four published programs

export default function ManageServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [drag, setDrag] = useState(null); // { id, overId, place }

  function load() {
    return api.get('/services.php', { params: { all: 1 } })
      .then(res => setServices(res.data.services || []))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function saveOrder(list) {
    setServices(list);
    try {
      await api.post('/services.php?action=reorder', { order: list.map(s => s.id) });
      setToast({ type: 'success', message: 'Order saved.' });
    } catch {
      setToast({ type: 'error', message: 'Could not save the new order.' });
      load();
    }
  }

  function move(index, step) {
    const to = index + step;
    if (to < 0 || to >= services.length) return;
    const list = [...services];
    [list[index], list[to]] = [list[to], list[index]];
    saveOrder(list);
  }

  function drop(target) {
    if (!drag || drag.id === target.id) { setDrag(null); return; }
    const moving = services.find(s => s.id === drag.id);
    const list = services.filter(s => s.id !== drag.id);
    let at = list.findIndex(s => s.id === target.id);
    if (drag.place === 'after') at += 1;
    list.splice(at, 0, moving);
    setDrag(null);
    saveOrder(list);
  }

  async function handleDelete(s) {
    if (!confirm(`Delete "${decodeHtml(s.title)}"? Its photos will be deleted too. This cannot be undone.`)) return;
    await api.delete(`/services.php?id=${s.id}`);
    setToast({ type: 'success', message: 'Program deleted.' });
    load();
  }

  // Which published programs land on the homepage
  const homepageIds = services.filter(s => Number(s.is_published)).slice(0, HOMEPAGE_COUNT).map(s => s.id);
  const hiddenCount = services.filter(s => !Number(s.is_published)).length;

  return (
    <div className="svc">
      <div className="admin-page-header">
        <div>
          <h2>Programs</h2>
          <p className="ofc-sub">
            Shown on the Programs page in this order. The first {HOMEPAGE_COUNT} published programs also appear under "What we do" on the homepage.
          </p>
        </div>
        <div className="ofc-header-actions">
          <a className="btn btn-outline btn-sm" href="/services" target="_blank" rel="noreferrer">View page <FaExternalLinkAlt /></a>
          <Link to="/admin/services/new" className="btn btn-primary"><FaPlus /> Add program</Link>
        </div>
      </div>

      {!loading && services.length > 0 && (
        <div className="ofc-summary">
          <span><strong>{services.length}</strong> programs</span>
          <span><strong>{homepageIds.length}</strong> on homepage</span>
          {hiddenCount > 0 && <span><strong>{hiddenCount}</strong> hidden</span>}
        </div>
      )}

      {loading && <div className="admin-loading">Loading…</div>}
      {!loading && services.length === 0 && (
        <div className="svc-empty">
          <p>No programs yet.</p>
          <Link to="/admin/services/new" className="btn btn-primary"><FaPlus /> Add the first program</Link>
        </div>
      )}

      <ol className="svc-list">
        {services.map((s, i) => {
          const published = Number(s.is_published) === 1;
          const onHome = homepageIds.includes(s.id);
          const summary = decodeHtml(s.summary) || plainText(s.description);
          return (
            <li
              key={s.id}
              className={`svc-row ${!published ? 'is-hidden' : ''} ${drag?.id === s.id ? 'is-dragging' : ''} ${drag?.overId === s.id && drag.id !== s.id ? `is-target-${drag.place}` : ''}`}
              draggable
              onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(s.id)); setDrag({ id: s.id, overId: null, place: 'before' }); }}
              onDragOver={e => {
                if (!drag) return;
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                const place = e.clientY < r.top + r.height / 2 ? 'before' : 'after';
                if (drag.overId !== s.id || drag.place !== place) setDrag(d => ({ ...d, overId: s.id, place }));
              }}
              onDrop={e => { e.preventDefault(); drop(s); }}
              onDragEnd={() => setDrag(null)}
            >
              <span className="ofc-grip" title="Drag to reorder" aria-hidden="true"><FaGripVertical /></span>
              <span className="svc-num mono">{String(i + 1).padStart(2, '0')}</span>
              {s.image_path
                ? <img className="svc-thumb" src={assetUrl(s.image_path)} alt="" loading="lazy" />
                : <span className="svc-thumb svc-thumb-empty" aria-hidden="true" />}
              <Link to={`/admin/services/${s.id}`} className="svc-text">
                <strong>{decodeHtml(s.title)}</strong>
                <span>{summary}</span>
              </Link>
              <div className="svc-badges">
                {onHome && <span className="svc-badge svc-badge-home"><FaHome /> Homepage</span>}
                {!published && <span className="svc-badge svc-badge-hidden"><FaEyeSlash /> Hidden</span>}
                {published && !decodeHtml(s.summary) && <span className="svc-badge svc-badge-warn" title="Add a short summary for the homepage">No summary</span>}
              </div>
              <div className="svc-actions">
                <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><FaArrowUp /></button>
                <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === services.length - 1} aria-label="Move down"><FaArrowDown /></button>
                <Link to={`/admin/services/${s.id}`} className="icon-btn" aria-label="Edit"><FaEdit /></Link>
                <button type="button" className="icon-btn danger" onClick={() => handleDelete(s)} aria-label="Delete"><FaTrash /></button>
              </div>
            </li>
          );
        })}
      </ol>

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </div>
  );
}
