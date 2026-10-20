import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaExternalLinkAlt, FaImage, FaTrash, FaFileAlt, FaLink, FaCloudUploadAlt, FaPlus, FaTimes } from 'react-icons/fa';
import api, { assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { FeaturedMaterial, MaterialRow } from '../../components/MaterialCards.jsx';
import { MATERIAL_TYPES, COMMON_LANGUAGES, materialHref } from '../../constants/materials.js';
import { resizeImage } from '../../utils/resizeImage.js';
import { decodeHtml, fileExtension, formatBytes } from '../../utils/format.js';
import './PostEditor.css';
import './ManageMaterials.css';
import './MaterialEditor.css';

const FILE_MAX = 30 * 1024 * 1024; // matches handleDocumentUpload on the server
const FILE_EXTS = ['pdf', 'docx', 'pptx', 'xlsx'];
const thisYear = String(new Date().getFullYear());
const EMPTY = {
  title: '', type: 'module', description: '', year: thisYear,
  is_published: '1', is_featured: '0', external_url: '',
};
const FIELDS = Object.keys(EMPTY);
const splitLangs = text => decodeHtml(text || '').split(',').map(l => l.trim()).filter(Boolean);

function MaterialEditorForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState(EMPTY);
  const [langs, setLangs] = useState(['English']);
  const [otherLang, setOtherLang] = useState('');
  const [saved, setSaved] = useState({ ...EMPTY, language: 'English', source: 'file' });
  const [source, setSource] = useState('file');          // 'file' | 'link'
  const [stored, setStored] = useState({ file: null, size: null, cover: null, downloads: 0 });
  const [file, setFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(location.state?.toast || null);
  const fileInput = useRef(null);
  const coverInput = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const notify = (type, message) => setToast({ type, message });
  const language = langs.join(', ');

  useEffect(() => {
    if (isNew) return;
    api.get('/materials.php', { params: { id } })
      .then(res => {
        const m = res.data.material;
        const values = {
          title: decodeHtml(m.title),
          type: m.type,
          description: decodeHtml(m.description || ''),
          year: m.year ? String(m.year) : '',
          is_published: String(Number(m.is_published)),
          is_featured: String(Number(m.is_featured)),
          external_url: m.external_url || '',
        };
        const src = m.file_path ? 'file' : 'link';
        setForm(values);
        setLangs(splitLangs(m.language));
        setSource(src);
        setSaved({ ...values, language: splitLangs(m.language).join(', '), source: src });
        setStored({ file: m.file_path, size: m.file_size, cover: m.cover_image, downloads: Number(m.download_count || 0) });
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const dirty = useMemo(
    () => FIELDS.some(k => form[k] !== saved[k]) || language !== saved.language || source !== saved.source
      || Boolean(file) || Boolean(coverFile) || removeCover,
    [form, saved, language, source, file, coverFile, removeCover],
  );

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const [coverPreview, setCoverPreview] = useState(null);
  useEffect(() => {
    if (!coverFile) { setCoverPreview(null); return; }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);
  const coverSrc = coverPreview || (!removeCover && stored.cover ? assetUrl(stored.cover) : null);

  const hasSource = source === 'file' ? Boolean(file || stored.file) : /^https?:\/\/\S+\.\S+/i.test(form.external_url.trim());

  const save = useCallback(async () => {
    if (!form.title.trim()) { notify('error', 'Give the material a title first.'); return; }
    if (!hasSource) {
      notify('error', source === 'file' ? 'Attach the file people will download.' : 'Add a full link starting with https://');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      ['title', 'type', 'description', 'year', 'is_published', 'is_featured'].forEach(k => fd.append(k, form[k]));
      fd.append('language', language);
      if (source === 'file') {
        if (file) fd.append('file', file);
      } else {
        fd.append('source', 'link');
        fd.append('external_url', form.external_url.trim());
      }
      if (coverFile) fd.append('cover', await resizeImage(coverFile, { maxDimension: 1200 }));
      else if (removeCover) fd.append('remove_cover', '1');
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
      const message = form.is_published === '1' ? 'Material saved and published.' : 'Material saved (hidden from the site).';

      if (isNew) {
        const res = await api.post('/materials.php', fd, cfg);
        setSaved({ ...form, language, source });
        navigate(`/admin/materials/${res.data.id}`, { replace: true, state: { toast: { type: 'success', message } } });
        return;
      }
      await api.post(`/materials.php?id=${id}&_method=PUT`, fd, cfg);
      const m = (await api.get('/materials.php', { params: { id } })).data.material;
      setStored({ file: m.file_path, size: m.file_size, cover: m.cover_image, downloads: Number(m.download_count || 0) });
      setSaved({ ...form, language, source });
      setFile(null); setCoverFile(null); setRemoveCover(false);
      notify('success', message);
    } catch (err) {
      notify('error', err.response?.data?.message || 'Failed to save the material.');
    } finally {
      setSaving(false);
    }
  }, [form, language, source, file, coverFile, removeCover, isNew, id, navigate, hasSource]);

  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!saving) save(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [save, saving]);

  function chooseFile(f) {
    if (!f) return;
    const ext = (/\.([a-z0-9]+)$/i.exec(f.name)?.[1] || '').toLowerCase();
    if (!FILE_EXTS.includes(ext)) { notify('error', 'Choose a PDF, DOCX, PPTX or XLSX file.'); return; }
    if (f.size > FILE_MAX) { notify('error', `That file is ${formatBytes(f.size)}. The limit is 30 MB.`); return; }
    setFile(f);
    // Fill the title from the file name when it's still empty
    if (!form.title.trim()) set('title', f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim());
  }

  function toggleLang(l) {
    setLangs(list => (list.includes(l) ? list.filter(x => x !== l) : [...list, l]));
  }
  function addOtherLang(e) {
    e?.preventDefault();
    const l = otherLang.trim();
    if (l && !langs.some(x => x.toLowerCase() === l.toLowerCase())) setLangs(list => [...list, l]);
    setOtherLang('');
  }

  function leave(e) {
    if (dirty && !confirm('You have unsaved changes. Leave without saving?')) e.preventDefault();
  }
  async function handleDelete() {
    if (!confirm('Delete this material? Its file will be deleted too. This cannot be undone.')) return;
    await api.delete(`/materials.php?id=${id}`);
    setSaved({ ...form, language, source });
    setFile(null); setCoverFile(null); setRemoveCover(false);
    navigate('/admin/materials', { replace: true });
  }

  if (loading) return <div className="admin-loading">Loading material…</div>;
  if (loadError) {
    return (
      <div className="pe-error">
        <h2>That material could not be loaded.</h2>
        <p>It may have been deleted, or the connection dropped. Nothing was changed.</p>
        <Link to="/admin/materials" className="btn btn-primary"><FaArrowLeft /> Back to materials</Link>
      </div>
    );
  }

  const published = form.is_published === '1';
  const featured = form.is_featured === '1';
  const otherLangs = langs.filter(l => !COMMON_LANGUAGES.includes(l));
  // Shape used by the shared public cards for the previews
  const preview = {
    ...form,
    language,
    cover_image: null,
    file_path: source === 'file' ? (file ? file.name : stored.file) : null,
    file_size: source === 'file' ? (file ? file.size : stored.size) : null,
    external_url: source === 'link' ? form.external_url : null,
  };

  return (
    // noValidate: our own checks give clearer messages than the browser's URL tooltip
    <form className="pe" noValidate onSubmit={e => { e.preventDefault(); save(); }}>
      <div className="pe-topbar">
        <Link to="/admin/materials" className="pe-back" onClick={leave}><FaArrowLeft /> All materials</Link>
        <div className="pe-topbar-title">
          <h2>{isNew ? 'New material' : 'Edit material'}</h2>
          <span className={`pe-state ${dirty ? 'is-dirty' : ''}`}>
            {dirty ? 'Unsaved changes' : isNew ? 'Not saved yet' : `${saved.is_published === '1' ? 'Published' : 'Hidden'} · saved · ${stored.downloads} download${stored.downloads === 1 ? '' : 's'}`}
          </span>
        </div>
        <div className="pe-topbar-actions">
          {isNew ? (
            <span className="btn btn-outline btn-sm is-disabled" aria-disabled="true" title="Save the material first">Open file <FaExternalLinkAlt /></span>
          ) : (
            <a className="btn btn-outline btn-sm" href={materialHref({ id })} target="_blank" rel="noreferrer" title="Opens the saved file or link (admin opens aren't counted)">
              Open file <FaExternalLinkAlt />
            </a>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isNew ? (published ? 'Publish' : 'Save hidden') : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="pe-layout">
        <div className="pe-main">
          <label className="sr-only" htmlFor="mat-title">Title</label>
          <textarea
            id="mat-title" className="pe-title" rows={1} placeholder="Material title"
            value={form.title} onChange={e => set('title', e.target.value.replace(/\n/g, ' '))}
            ref={el => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
          />

          <div className="pe-field">
            <label htmlFor="mat-desc" className="pe-label">Short description</label>
            <textarea id="mat-desc" rows={3} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Who it's for and what's inside, in a sentence or two." />
          </div>

          {/* ---------- file or link ---------- */}
          <div className="pe-field">
            <div className="pe-field-head">
              <span className="pe-label">What people get</span>
              <div className="pe-segment mat-source" role="radiogroup" aria-label="Source">
                <button type="button" role="radio" aria-checked={source === 'file'} className={source === 'file' ? 'is-on' : ''} onClick={() => setSource('file')}><FaFileAlt /> Upload a file</button>
                <button type="button" role="radio" aria-checked={source === 'link'} className={source === 'link' ? 'is-on' : ''} onClick={() => setSource('link')}><FaLink /> Link</button>
              </div>
            </div>

            {source === 'file' ? (
              <div
                className={`mat-file ${file || stored.file ? 'has-file' : ''}`}
                onDragOver={e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }}
                onDrop={e => { e.preventDefault(); chooseFile(e.dataTransfer.files?.[0]); }}
              >
                {file || stored.file ? (
                  <>
                    <span className="mat-file-ext poster">{fileExtension(file ? file.name : stored.file)}</span>
                    <div className="mat-file-text">
                      <strong>{file ? file.name : 'Current file'}</strong>
                      <span className="mono">
                        {formatBytes(file ? file.size : stored.size)}
                        {file ? ' · uploads when you save' : <> · <a href={assetUrl(stored.file)} target="_blank" rel="noreferrer">open</a></>}
                      </span>
                    </div>
                    <button type="button" className="btn btn-sm" onClick={() => fileInput.current?.click()}>Replace</button>
                    {file && <button type="button" className="pe-link" onClick={() => setFile(null)}>Undo</button>}
                  </>
                ) : (
                  <button type="button" className="mat-file-drop" onClick={() => fileInput.current?.click()}>
                    <FaCloudUploadAlt />
                    <strong>Drop a file here or click to choose</strong>
                    <span className="mono">PDF, DOCX, PPTX or XLSX · up to 30 MB</span>
                  </button>
                )}
                <input ref={fileInput} type="file" hidden accept=".pdf,.docx,.pptx,.xlsx"
                  onChange={e => { chooseFile(e.target.files?.[0]); e.target.value = ''; }} />
              </div>
            ) : (
              <div className="mat-link">
                <input
                  type="url" value={form.external_url} onChange={e => set('external_url', e.target.value)}
                  placeholder="https://drive.google.com/…" aria-label="Link"
                />
                <p className="pe-hint">For large files kept on Google Drive, videos on YouTube, or designs on Canva. Make sure sharing is set so anyone with the link can view.
                  {stored.file && ' Saving as a link removes the uploaded file.'}</p>
              </div>
            )}
          </div>

          <div className="pe-field">
            <span className="pe-label">Previews</span>
            <div className="mat-prev-row">
              <table className="materials-table">
                <tbody><MaterialRow item={preview} preview /></tbody>
              </table>
            </div>
            {featured && (
              <div className="mat-prev-feature">
                <FeaturedMaterial item={preview} primary preview coverSrc={coverSrc} />
              </div>
            )}
            <p className="pe-hint">{featured ? 'Table row and featured card on the Materials page.' : 'How the row looks in the Materials table. Feature it to see the large card.'}</p>
          </div>
        </div>

        {/* ---------- sidebar ---------- */}
        <aside className="pe-side">
          <section className="pe-panel">
            <h3>Visibility</h3>
            <div className="pe-segment" role="radiogroup" aria-label="Visibility">
              {[['1', 'Published'], ['0', 'Hidden']].map(([value, label]) => (
                <button key={value} type="button" role="radio" aria-checked={form.is_published === value}
                  className={form.is_published === value ? 'is-on' : ''} onClick={() => set('is_published', value)}>{label}</button>
              ))}
            </div>
            <label className="form-check alb-featured">
              <input type="checkbox" checked={featured} onChange={e => set('is_featured', e.target.checked ? '1' : '0')} />
              Feature at the top of the Materials page
            </label>
            <p className="pe-hint">{published ? 'Up to two featured materials are shown large; the rest are listed in the table.' : 'Hidden materials stay in the admin until you publish them.'}</p>
            {!isNew && <button type="button" className="pe-delete" onClick={handleDelete}><FaTrash /> Delete material</button>}
          </section>

          <section className="pe-panel">
            <h3>Details</h3>
            <span className="ofc-field-label">Type</span>
            <div className="mat-types" role="radiogroup" aria-label="Type">
              {MATERIAL_TYPES.map(t => (
                <button key={t.value} type="button" role="radio" aria-checked={form.type === t.value}
                  className={form.type === t.value ? 'is-on' : ''} onClick={() => set('type', t.value)}>{t.label}</button>
              ))}
            </div>
            <div className="form-row">
              <label htmlFor="mat-year">Year</label>
              <input id="mat-year" type="number" min="1950" max={Number(thisYear) + 1} value={form.year} onChange={e => set('year', e.target.value)} />
            </div>
            <span className="ofc-field-label">Language</span>
            <div className="mat-langs">
              {COMMON_LANGUAGES.map(l => (
                <label key={l} className={`mat-lang ${langs.includes(l) ? 'is-on' : ''}`}>
                  <input type="checkbox" checked={langs.includes(l)} onChange={() => toggleLang(l)} /> {l}
                </label>
              ))}
              {otherLangs.map(l => (
                <span key={l} className="mat-lang is-on">{l}<button type="button" onClick={() => toggleLang(l)} aria-label={`Remove ${l}`}><FaTimes /></button></span>
              ))}
            </div>
            <div className="mat-lang-add">
              <input value={otherLang} onChange={e => setOtherLang(e.target.value)} placeholder="Other language"
                onKeyDown={e => { if (e.key === 'Enter') addOtherLang(e); }} aria-label="Other language" />
              <button type="button" className="btn btn-sm" onClick={addOtherLang} disabled={!otherLang.trim()}><FaPlus /> Add</button>
            </div>
          </section>

          <section className="pe-panel">
            <h3>Cover image</h3>
            {coverSrc ? (
              <div className="pe-cover">
                <img src={coverSrc} alt="Cover preview" />
                <div className="pe-cover-actions">
                  <button type="button" className="btn btn-sm" onClick={() => coverInput.current?.click()}>Replace</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setCoverFile(null); setRemoveCover(Boolean(stored.cover)); }}>Remove</button>
                </div>
              </div>
            ) : (
              <button type="button" className="pe-cover-drop" onClick={() => coverInput.current?.click()}>
                <FaImage />
                <span>Optional cover image</span>
                <span className="mono">e.g. the poster itself or the report cover</span>
              </button>
            )}
            <input ref={coverInput} type="file" hidden accept="image/png, image/jpeg, image/webp"
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setCoverFile(f); setRemoveCover(false); } }} />
            <p className="pe-hint">Shown on the featured card.</p>
          </section>
        </aside>
      </div>

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </form>
  );
}

// New and edit share this component; key by id for a fresh editor after the first save.
export default function MaterialEditor() {
  const { id } = useParams();
  return <MaterialEditorForm key={id || 'new'} />;
}
