import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaExternalLinkAlt, FaImage, FaTrash, FaHome } from 'react-icons/fa';
import api, { assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import RichTextEditor from '../../components/RichTextEditor.jsx';
import { resizeImage } from '../../utils/resizeImage.js';
import { renderPostHtml, plainText } from '../../utils/postContent.js';
import { decodeHtml } from '../../utils/format.js';
import { HOMEPAGE_COUNT } from './ManageServices.jsx';
import './PostEditor.css';
import './ServiceEditor.css';

const EMPTY = { title: '', summary: '', description: '', is_published: '1' };
const FIELDS = Object.keys(EMPTY);
const SUMMARY_MAX = 300;

// 1-based place among published programs (null when hidden)
function publishedPosition(all, id) {
  const idx = all.filter(x => Number(x.is_published)).findIndex(x => String(x.id) === String(id));
  return idx === -1 ? null : idx + 1;
}

const hasBody = html => Boolean((html || '').replace(/<[^>]*>/g, '').trim()) || /<img\b/i.test(html || '');

function ServiceEditorForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(EMPTY);
  const [image, setImage] = useState(null);           // stored image path
  const [position, setPosition] = useState(null);     // 1-based place in the published order
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(location.state?.toast || null);
  const fileInput = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (isNew) return;
    Promise.all([api.get('/services.php', { params: { id } }), api.get('/services.php', { params: { all: 1 } })])
      .then(([one, all]) => {
        const s = one.data.service;
        const values = {
          title: decodeHtml(s.title),
          summary: decodeHtml(s.summary || ''),
          description: s.description || '',
          is_published: String(Number(s.is_published)),
        };
        setForm(values);
        setSaved(values);
        setImage(s.image_path);
        setPosition(publishedPosition(all.data.services || [], s.id));
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const dirty = useMemo(
    () => FIELDS.some(k => form[k] !== saved[k]) || Boolean(imageFile) || removeImage,
    [form, saved, imageFile, removeImage],
  );

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const [filePreview, setFilePreview] = useState(null);
  useEffect(() => {
    if (!imageFile) { setFilePreview(null); return; }
    const url = URL.createObjectURL(imageFile);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);
  const imageSrc = filePreview || (!removeImage && image ? assetUrl(image) : null);

  const save = useCallback(async () => {
    if (!form.title.trim()) { setToast({ type: 'error', message: 'Give the program a title first.' }); return; }
    if (!hasBody(form.description)) { setToast({ type: 'error', message: 'Write the program description before saving.' }); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      FIELDS.forEach(k => fd.append(k, form[k]));
      if (imageFile) fd.append('image', await resizeImage(imageFile));
      else if (removeImage) fd.append('remove_image', '1');
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
      const message = form.is_published === '1' ? 'Program saved and published.' : 'Program saved (hidden from the site).';
      if (isNew) {
        const res = await api.post('/services.php', fd, cfg);
        setSaved(form);
        navigate(`/admin/services/${res.data.id}`, { replace: true, state: { toast: { type: 'success', message } } });
        return;
      }
      await api.post(`/services.php?id=${id}&_method=PUT`, fd, cfg);
      const [fresh, all] = await Promise.all([
        api.get('/services.php', { params: { id } }),
        api.get('/services.php', { params: { all: 1 } }),
      ]);
      setImage(fresh.data.service.image_path);
      setPosition(publishedPosition(all.data.services || [], id));
      setSaved(form);
      setImageFile(null);
      setRemoveImage(false);
      setToast({ type: 'success', message });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save program.' });
    } finally {
      setSaving(false);
    }
  }, [form, imageFile, removeImage, isNew, id, navigate]);

  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!saving) save(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [save, saving]);

  function leave(e) {
    if (dirty && !confirm('You have unsaved changes. Leave without saving?')) e.preventDefault();
  }

  async function handleDelete() {
    if (!confirm('Delete this program? Its photos will be deleted too. This cannot be undone.')) return;
    await api.delete(`/services.php?id=${id}`);
    setSaved(form);
    navigate('/admin/services', { replace: true });
  }

  if (loading) return <div className="admin-loading">Loading program…</div>;
  if (loadError) {
    return (
      <div className="pe-error">
        <h2>That program could not be loaded.</h2>
        <p>It may have been deleted, or the connection dropped. Nothing was changed.</p>
        <Link to="/admin/services" className="btn btn-primary"><FaArrowLeft /> Back to programs</Link>
      </div>
    );
  }

  const published = form.is_published === '1';
  const savedPublished = saved.is_published === '1';
  const summaryText = form.summary.trim() || plainText(form.description);
  const onHomepage = published && (isNew ? null : position !== null && position <= HOMEPAGE_COUNT);

  return (
    <form className="pe" onSubmit={e => { e.preventDefault(); save(); }}>
      <div className="pe-topbar">
        <Link to="/admin/services" className="pe-back" onClick={leave}><FaArrowLeft /> All programs</Link>
        <div className="pe-topbar-title">
          <h2>{isNew ? 'New program' : 'Edit program'}</h2>
          <span className={`pe-state ${dirty ? 'is-dirty' : ''}`}>
            {dirty ? 'Unsaved changes' : isNew ? 'Not saved yet' : savedPublished ? 'Published · saved' : 'Hidden · saved'}
          </span>
        </div>
        <div className="pe-topbar-actions">
          {isNew ? (
            <span className="btn btn-outline btn-sm is-disabled" aria-disabled="true" title="Save the program first">View site <FaExternalLinkAlt /></span>
          ) : (
            <a className="btn btn-outline btn-sm" href={`/services#program-${id}`} target="_blank" rel="noreferrer"
              title={!savedPublished ? 'Hidden programs are not on the public page' : dirty ? 'Shows the last saved version' : 'Open the Programs page in a new tab'}>
              View site <FaExternalLinkAlt />
            </a>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isNew ? (published ? 'Publish' : 'Save hidden') : 'Save changes'}</button>
        </div>
      </div>

      <div className="pe-layout">
        <div className="pe-main">
          <label className="sr-only" htmlFor="svc-title">Program name</label>
          <textarea
            id="svc-title" className="pe-title" rows={1} placeholder="Program name"
            value={form.title}
            onChange={e => set('title', e.target.value.replace(/\n/g, ' '))}
            ref={el => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
          />

          <div className="pe-field">
            <div className="pe-field-head">
              <label htmlFor="svc-summary">Homepage summary</label>
              <span className={`pe-count ${form.summary.length > SUMMARY_MAX - 30 ? 'is-near' : ''}`}>{form.summary.length}/{SUMMARY_MAX}</span>
            </div>
            <textarea
              id="svc-summary" rows={2} maxLength={SUMMARY_MAX}
              value={form.summary} onChange={e => set('summary', e.target.value)}
              placeholder="One or two sentences for the &quot;What we do&quot; list on the homepage."
            />
            {!form.summary.trim() && form.description && (
              <p className="pe-hint">Empty: the homepage will use the start of the description instead.</p>
            )}
          </div>

          <div className="pe-field">
            <div className="pe-field-head">
              <span className="pe-label">Full description</span>
              <span className="pe-count">Shown on the Programs page</span>
            </div>
            <RichTextEditor
              value={form.description}
              onChange={description => set('description', description)}
              onError={message => setToast({ type: 'error', message })}
            />
          </div>
        </div>

        <aside className="pe-side">
          <section className="pe-panel">
            <h3>Visibility</h3>
            <div className="pe-segment" role="radiogroup" aria-label="Visibility">
              {[['1', 'Published'], ['0', 'Hidden']].map(([value, label]) => (
                <button key={value} type="button" role="radio" aria-checked={form.is_published === value}
                  className={form.is_published === value ? 'is-on' : ''} onClick={() => set('is_published', value)}>{label}</button>
              ))}
            </div>
            <p className="pe-hint">
              {!published
                ? 'Hidden programs stay in the admin only.'
                : isNew
                  ? 'New programs are added at the end of the list. Reorder them on the Programs list.'
                  : position === null
                    ? 'Save to publish it; it will be added at the end of the list.'
                    : onHomepage
                      ? `Program ${position} of the list, so it shows on the homepage.`
                      : `Program ${position} of the list. Only the first ${HOMEPAGE_COUNT} show on the homepage; reorder on the Programs list.`}
            </p>
            {!isNew && <button type="button" className="pe-delete" onClick={handleDelete}><FaTrash /> Delete program</button>}
          </section>

          <section className="pe-panel">
            <h3>Photo</h3>
            {imageSrc ? (
              <div className="pe-cover">
                <img src={imageSrc} alt="Program photo preview" />
                <div className="pe-cover-actions">
                  <button type="button" className="btn btn-sm" onClick={() => fileInput.current?.click()}>Replace</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setImageFile(null); setRemoveImage(Boolean(image)); }}>Remove</button>
                </div>
              </div>
            ) : (
              <button type="button" className="pe-cover-drop" onClick={() => fileInput.current?.click()}>
                <FaImage />
                <span>Choose a photo</span>
                <span className="mono">JPG, PNG or WEBP · resized automatically</span>
              </button>
            )}
            <input ref={fileInput} type="file" hidden accept="image/png, image/jpeg, image/webp"
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setImageFile(f); setRemoveImage(false); } }} />
          </section>

          <section className="pe-panel pe-panel-preview">
            <h3><FaHome /> Homepage preview</h3>
            <div className="svc-prev-home">
              <span className="mono svc-prev-num">{String(position && published ? position : 1).padStart(2, '0')}</span>
              <div>
                <strong className="poster">{form.title || 'Program name'}</strong>
                <p>{summaryText || 'Add a summary or description.'}</p>
              </div>
              {imageSrc && <img src={imageSrc} alt="" />}
            </div>
          </section>

          <section className="pe-panel pe-panel-preview">
            <h3>Programs page preview</h3>
            <div className="svc-prev-page">
              {imageSrc ? <img src={imageSrc} alt="" /> : <span className="svc-prev-noimg" />}
              <span className="mono svc-prev-label">Program {String(position && published ? position : 1).padStart(2, '0')}</span>
              <strong className="poster">{form.title || 'Program name'}</strong>
              {/* renderPostHtml sanitizes with DOMPurify before injecting */}
              <div className="prose svc-prev-body" dangerouslySetInnerHTML={{ __html: renderPostHtml(form.description) || '<p>Description…</p>' }} />
            </div>
          </section>
        </aside>
      </div>

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </form>
  );
}

// New and edit share this component; key by id for a fresh editor after the first save.
export default function ServiceEditor() {
  const { id } = useParams();
  return <ServiceEditorForm key={id || 'new'} />;
}
