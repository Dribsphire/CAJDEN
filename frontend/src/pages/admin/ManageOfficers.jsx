import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaPlus, FaEdit, FaTrash, FaTimes, FaArrowUp, FaArrowDown, FaGripVertical,
  FaExternalLinkAlt, FaExclamationTriangle, FaImage,
} from 'react-icons/fa';
import api, { assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { decodeHtml, decodeRecord } from '../../utils/format.js';
import { splitName, initials } from '../../utils/people.js';
import { resizeImage } from '../../utils/resizeImage.js';
import { DEPARTMENTS } from '../../constants/officers.js';
import './ManageOfficers.css';

const LEVELS = [
  { value: 1, label: 'Board of Trustees' },
  { value: 2, label: 'Executive Director' },
  { value: 3, label: 'Department staff' },
];
const TINTS = ['tint-sun', 'tint-sky', 'tint-orange', 'tint-field'];
const EMPTY = { id: null, full_name: '', position_title: '', rank_level: 1, department: '', short_description: '' };

// Which group a person belongs to on the chart: board, director, or a department name.
const groupKey = o => (Number(o.rank_level) === 1 ? 'board' : Number(o.rank_level) === 2 ? 'director' : o.department || 'Staff');

function Avatar({ person, index = 0, size = 'md', src }) {
  const photo = src ?? (person.photo_path ? assetUrl(person.photo_path) : null);
  if (photo) return <img className={`ofc-avatar ofc-avatar-${size}`} src={photo} alt="" />;
  return (
    <span className={`ofc-avatar ofc-avatar-${size} ofc-initials ${TINTS[index % TINTS.length]}`} aria-hidden="true">
      {initials(splitName(person.full_name).name)}
    </span>
  );
}

/** One draggable person row inside a group. */
function PersonCard({ person, index, total, onEdit, onDelete, onMove, drag }) {
  const { name, credentials } = splitName(person.full_name);
  const isDragging = drag.state?.id === person.id;
  const isTarget = drag.state?.overId === person.id && !isDragging;
  return (
    <li
      className={`ofc-card ${isDragging ? 'is-dragging' : ''} ${isTarget ? `is-target-${drag.state.place}` : ''}`}
      draggable
      onDragStart={e => drag.start(e, person)}
      onDragOver={e => drag.over(e, person)}
      onDrop={e => drag.drop(e, person)}
      onDragEnd={drag.end}
    >
      <span className="ofc-grip" title="Drag to reorder" aria-hidden="true"><FaGripVertical /></span>
      <Avatar person={person} index={index} />
      <button type="button" className="ofc-card-text" onClick={() => onEdit(person)}>
        <strong>{name}</strong>
        {credentials && <span className="ofc-cred">{credentials}</span>}
        <span className="ofc-role">{decodeHtml(person.position_title)}</span>
      </button>
      <div className="ofc-card-actions">
        <button type="button" className="icon-btn" onClick={() => onMove(person, -1)} disabled={index === 0} aria-label={`Move ${name} up`}><FaArrowUp /></button>
        <button type="button" className="icon-btn" onClick={() => onMove(person, 1)} disabled={index === total - 1} aria-label={`Move ${name} down`}><FaArrowDown /></button>
        <button type="button" className="icon-btn" onClick={() => onEdit(person)} aria-label={`Edit ${name}`}><FaEdit /></button>
        <button type="button" className="icon-btn danger" onClick={() => onDelete(person)} aria-label={`Remove ${name}`}><FaTrash /></button>
      </div>
    </li>
  );
}

function Group({ title, tone = 'ink', people, emptyText, addLabel, onAdd, children, ...cardProps }) {
  return (
    <section className={`ofc-group ofc-group-${tone}`}>
      <header className="ofc-group-head">
        <h3>{title}</h3>
        <span className="ofc-count">{people.length}</span>
      </header>
      {children}
      {people.length > 0 ? (
        <ul className="ofc-list">
          {people.map((p, i) => <PersonCard key={p.id} person={p} index={i} total={people.length} {...cardProps} />)}
        </ul>
      ) : (
        <p className="ofc-empty">{emptyText}</p>
      )}
      <button type="button" className="ofc-add" onClick={onAdd}><FaPlus /> {addLabel}</button>
    </section>
  );
}

export default function ManageOfficers() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);  // form values while the drawer is open
  const [file, setFile] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [dragState, setDragState] = useState(null);
  const fileInput = useRef(null);

  function load() {
    return api.get('/officers.php')
      .then(res => setOfficers(res.data.officers || []))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  // Grouped exactly like the public org chart (already sorted by rank, sort_order).
  const groups = useMemo(() => {
    const map = new Map();
    officers.forEach(o => { const k = groupKey(o); map.set(k, [...(map.get(k) || []), o]); });
    return map;
  }, [officers]);
  const board = groups.get('board') || [];
  const directors = groups.get('director') || [];
  const extraDepts = [...groups.keys()].filter(k => !['board', 'director', ...DEPARTMENTS].includes(k));
  const departments = [...DEPARTMENTS, ...extraDepts];
  const staffCount = officers.filter(o => Number(o.rank_level) === 3).length;

  // ---------- ordering ----------
  async function saveOrder(list, message) {
    // optimistic: reflect the new order right away
    const ids = list.map(o => o.id);
    setOfficers(prev => {
      const rest = prev.filter(o => !ids.includes(o.id));
      const firstIndex = prev.findIndex(o => ids.includes(o.id));
      const next = [...rest];
      next.splice(firstIndex, 0, ...list);
      return next;
    });
    try {
      await api.post('/admin/reorder_officers.php', {
        order: list.map((o, i) => ({ id: o.id, rank_level: Number(o.rank_level), sort_order: i + 1 })),
      });
      if (message) setToast({ type: 'success', message });
    } catch {
      setToast({ type: 'error', message: 'Could not save the new order.' });
    }
    load();
  }

  function move(person, step) {
    const list = [...(groups.get(groupKey(person)) || [])];
    const from = list.findIndex(o => o.id === person.id);
    const to = from + step;
    if (to < 0 || to >= list.length) return;
    [list[from], list[to]] = [list[to], list[from]];
    saveOrder(list);
  }

  // Native drag and drop, limited to reordering inside one group.
  const drag = {
    state: dragState,
    start(e, person) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(person.id));
      setDragState({ id: person.id, group: groupKey(person), overId: null, place: 'before' });
    },
    over(e, person) {
      if (!dragState || groupKey(person) !== dragState.group) return;
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      const place = e.clientY < r.top + r.height / 2 ? 'before' : 'after';
      if (dragState.overId !== person.id || dragState.place !== place) setDragState(s => ({ ...s, overId: person.id, place }));
    },
    drop(e, person) {
      e.preventDefault();
      if (!dragState || groupKey(person) !== dragState.group || dragState.id === person.id) { setDragState(null); return; }
      const list = [...(groups.get(dragState.group) || [])];
      const moving = list.find(o => o.id === dragState.id);
      const without = list.filter(o => o.id !== dragState.id);
      let at = without.findIndex(o => o.id === person.id);
      if (dragState.place === 'after') at += 1;
      without.splice(at, 0, moving);
      setDragState(null);
      saveOrder(without, 'Order updated.');
    },
    end() { setDragState(null); },
  };

  // ---------- editing ----------
  function openNew(preset) {
    setToast(null);
    setEditing({ ...EMPTY, ...preset });
    setFile(null);
    setRemovePhoto(false);
  }
  function openEdit(person) {
    setToast(null);
    setEditing({ ...EMPTY, ...decodeRecord(person), rank_level: Number(person.rank_level), department: person.department || '' });
    setFile(null);
    setRemovePhoto(false);
  }
  function close() { if (!saving) setEditing(null); }

  useEffect(() => {
    if (!editing) return;
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }); // re-bind each render so close() sees current `saving`

  const [filePreview, setFilePreview] = useState(null);
  useEffect(() => {
    if (!file) { setFilePreview(null); return; }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleDelete(person) {
    const { name } = splitName(person.full_name);
    if (!confirm(`Remove ${name} from the hierarchy? Their photo will be deleted too.`)) return;
    await api.delete(`/officers.php?id=${person.id}`);
    setToast({ type: 'success', message: `${name} removed.` });
    if (editing?.id === person.id) setEditing(null);
    load();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const f = editing;
    if (f.rank_level === 3 && !f.department) {
      setToast({ type: 'error', message: 'Choose a department for department staff.' });
      return;
    }
    setSaving(true);
    try {
      const original = officers.find(o => o.id === f.id);
      const target = groupKey(f);
      const movedGroup = !original || groupKey(original) !== target;

      const fd = new FormData();
      ['full_name', 'position_title', 'short_description'].forEach(k => fd.append(k, f[k] || ''));
      fd.append('rank_level', String(f.rank_level));
      fd.append('department', f.rank_level === 3 ? f.department : '');
      // New people, or people moved to another group, go to the end of that group.
      if (movedGroup) fd.append('sort_order', String((groups.get(target) || []).length + 1));
      if (file) fd.append('photo', await resizeImage(file, { maxDimension: 800 }));
      else if (removePhoto) fd.append('remove_photo', '1');
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (f.id) await api.post(`/officers.php?id=${f.id}&_method=PUT`, fd, cfg);
      else await api.post('/officers.php', fd, cfg);

      setToast({ type: 'success', message: `${splitName(f.full_name).name} ${f.id ? 'updated' : 'added'}.` });
      setEditing(null);
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  }

  const cardProps = { onEdit: openEdit, onDelete: handleDelete, onMove: move, drag };
  const set = (k, v) => setEditing(f => ({ ...f, [k]: v }));
  const previewSrc = filePreview || (!removePhoto && editing?.photo_path ? assetUrl(editing.photo_path) : null);
  const draftName = editing ? splitName(editing.full_name) : null;

  return (
    <div className="ofc">
      <div className="admin-page-header">
        <div>
          <h2>Officers &amp; Hierarchy</h2>
          <p className="ofc-sub">
            Arranged like the org chart on the About page. Drag people to reorder them within a group.
          </p>
        </div>
        <div className="ofc-header-actions">
          <a className="btn btn-outline btn-sm" href="/about" target="_blank" rel="noreferrer">View chart <FaExternalLinkAlt /></a>
          <button className="btn btn-primary" onClick={() => openNew({})}><FaPlus /> Add person</button>
        </div>
      </div>

      {!loading && (
        <div className="ofc-summary">
          <span><strong>{board.length}</strong> trustees</span>
          <span><strong>{directors.length}</strong> executive director</span>
          <span><strong>{staffCount}</strong> staff in {departments.filter(d => (groups.get(d) || []).length).length} departments</span>
        </div>
      )}

      {!loading && directors.length === 0 && (
        <p className="ofc-warning"><FaExclamationTriangle /> No Executive Director yet. The chart connects the board to the departments through this person.</p>
      )}
      {directors.length > 1 && (
        <p className="ofc-warning"><FaExclamationTriangle /> {directors.length} people are set as Executive Director, but the chart only shows the first one. Move the others to the board or a department.</p>
      )}

      {loading ? <div className="admin-loading">Loading…</div> : (
        <div className="ofc-tree">
          <Group
            title="Board of Trustees" tone="ink" people={board}
            emptyText="No trustees yet." addLabel="Add trustee"
            onAdd={() => openNew({ rank_level: 1 })} {...cardProps}
          />
          <span className="ofc-line" aria-hidden="true" />
          <Group
            title="Executive Director" tone="orange" people={directors}
            emptyText="Not assigned." addLabel={directors.length ? 'Add another' : 'Assign director'}
            onAdd={() => openNew({ rank_level: 2, position_title: 'Executive Director' })} {...cardProps}
          />
          <span className="ofc-line" aria-hidden="true" />
          <div className="ofc-departments">
            {departments.map(d => (
              <Group
                key={d} title={d} tone="field" people={groups.get(d) || []}
                emptyText="No one in this department yet." addLabel={`Add to ${d}`}
                onAdd={() => openNew({ rank_level: 3, department: d })} {...cardProps}
              />
            ))}
          </div>
          <p className="ofc-footnote">
            Partner FBPOs shown under the chart are managed on the <Link to="/admin/partners">FBPOs page</Link>.
          </p>
        </div>
      )}

      {/* ---------- side editor ---------- */}
      {editing && (
        <div className="ofc-drawer-scrim" onClick={close}>
          <form className="ofc-drawer" onClick={e => e.stopPropagation()} onSubmit={handleSubmit} aria-label={editing.id ? 'Edit person' : 'Add person'}>
            <header className="ofc-drawer-head">
              <h3>{editing.id ? 'Edit person' : 'Add person'}</h3>
              <button type="button" className="icon-btn" onClick={close} aria-label="Close"><FaTimes /></button>
            </header>

            <div className="ofc-drawer-body">
              <div className="ofc-photo">
                <Avatar person={editing} size="lg" src={previewSrc} />
                <div className="ofc-photo-actions">
                  <button type="button" className="btn btn-sm" onClick={() => fileInput.current?.click()}>
                    <FaImage /> {previewSrc ? 'Replace photo' : 'Add photo'}
                  </button>
                  {previewSrc && (
                    <button type="button" className="ofc-link" onClick={() => { setFile(null); setRemovePhoto(Boolean(editing.photo_path)); }}>Remove photo</button>
                  )}
                  <span className="ofc-hint">Square photos work best. Initials are shown when there's no photo.</span>
                </div>
                <input
                  ref={fileInput} type="file" hidden accept="image/png, image/jpeg, image/webp"
                  onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setFile(f); setRemovePhoto(false); } }}
                />
              </div>

              <div className="form-row">
                <label htmlFor="ofc-name">Full name</label>
                <input id="ofc-name" value={editing.full_name} onChange={e => set('full_name', e.target.value)} required autoFocus placeholder="e.g. Ma. Lina M. Ganaba, M.A." />
                <span className="hint">Put credentials after a comma (", RSW, MSSW") to show them on their own line.</span>
              </div>
              <div className="form-row">
                <label htmlFor="ofc-position">Position</label>
                <input id="ofc-position" value={editing.position_title} onChange={e => set('position_title', e.target.value)} required placeholder="e.g. Board Chair, Finance Officer" />
              </div>

              <span className="ofc-field-label">Place on the chart</span>
              <div className="ofc-levels" role="radiogroup" aria-label="Place on the chart">
                {LEVELS.map(l => (
                  <button
                    key={l.value} type="button" role="radio" aria-checked={editing.rank_level === l.value}
                    className={editing.rank_level === l.value ? 'is-on' : ''}
                    onClick={() => set('rank_level', l.value)}
                  >{l.label}</button>
                ))}
              </div>
              {editing.rank_level === 3 && (
                <div className="form-row">
                  <label htmlFor="ofc-dept">Department</label>
                  <select id="ofc-dept" value={editing.department} onChange={e => set('department', e.target.value)} required>
                    <option value="" disabled>Choose a department…</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
              {editing.rank_level === 2 && directors.some(d => d.id !== editing.id) && (
                <p className="ofc-warning ofc-warning-sm"><FaExclamationTriangle /> There is already an Executive Director. Only one is shown on the chart.</p>
              )}

              <div className="form-row">
                <label htmlFor="ofc-desc">Notes (optional)</label>
                <textarea id="ofc-desc" rows={3} value={editing.short_description || ''} onChange={e => set('short_description', e.target.value)} />
                <span className="hint">For internal reference; not shown on the public chart.</span>
              </div>

              <span className="ofc-field-label">Preview</span>
              <div className="ofc-preview">
                <Avatar person={editing} src={previewSrc} />
                <div className="ofc-card-text ofc-card-text-static">
                  <strong>{draftName.name || 'Full name'}</strong>
                  {draftName.credentials && <span className="ofc-cred">{draftName.credentials}</span>}
                  <span className="ofc-role">{editing.position_title || 'Position'}</span>
                </div>
              </div>
            </div>

            <footer className="ofc-drawer-foot">
              {editing.id && (
                <button type="button" className="ofc-delete" onClick={() => handleDelete(editing)}><FaTrash /> Remove</button>
              )}
              <button type="button" className="btn btn-outline btn-sm" onClick={close} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing.id ? 'Save changes' : 'Add person'}</button>
            </footer>
          </form>
        </div>
      )}

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </div>
  );
}
