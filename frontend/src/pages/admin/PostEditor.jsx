import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaExternalLinkAlt, FaImage, FaTrash } from 'react-icons/fa';
import api, { assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import RichTextEditor from '../../components/RichTextEditor.jsx';
import { resizeImage } from '../../utils/resizeImage.js';
import { formatDate } from '../../utils/format.js';
import '../../components/PostCard.css';
import './PostEditor.css';

const EMPTY = {
  type: 'news', title: '', category: '', author: '',
  short_description: '', content: '', status: 'published',
  event_date: '', event_venue: '', published_at: '',
};
const FIELDS = Object.keys(EMPTY);
const TYPES = [
  { value: 'news', label: 'News' },
  { value: 'blog', label: 'Blog' },
  { value: 'event', label: 'Event' },
];
const SUMMARY_MAX = 500;
const LONG_DATE = { month: 'long', day: 'numeric', year: 'numeric' };

function saveMessage(values, wasPublic) {
  if (values.status === 'draft') return 'Draft saved.';
  if (isFuture(values.published_at)) return `Scheduled for ${formatDate(values.published_at, LONG_DATE)}.`;
  return wasPublic ? 'Changes saved.' : 'Post published.';
} // posts.short_description is VARCHAR(500)

const hasBody = html => Boolean((html || '').replace(/<[^>]*>/g, '').trim()) || /<img\b/i.test(html || '');
// "2026-11-14 08:00:00" -> "2026-11-14" for <input type="date">
const toDay = v => (v && !String(v).startsWith('0000') ? String(v).slice(0, 10) : '');
// "2026-11-14T08:00" for the event's <input type="datetime-local">
const toInputDateTime = v => (v && !String(v).startsWith('0000') ? String(v).slice(0, 16).replace(' ', 'T') : '');
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// A post scheduled for a later day; "YYYY-MM-DD" strings compare correctly as text.
const isFuture = day => Boolean(day) && day > localToday();
const wordCount = html => ((html || '').replace(/<[^>]*>/g, ' ').match(/\S+/g) || []).length;

function PostEditorForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(EMPTY);          // last saved values, for "unsaved changes"
  const [meta, setMeta] = useState({ slug: null, cover: null });
  const [coverFile, setCoverFile] = useState(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [toast, setToast] = useState(location.state?.toast || null);
  const coverInput = useRef(null);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  // Load the post when editing
  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    api.get('/posts.php', { params: { id } })
      .then(res => {
        const p = res.data.post;
        const values = {};
        FIELDS.forEach(k => { values[k] = p[k] ?? ''; });
        values.event_date = toInputDateTime(p.event_date);
        values.published_at = toDay(p.published_at);
        setForm(values);
        setSaved(values);
        setMeta({ slug: p.slug, cover: p.cover_image });
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  // Existing categories, for suggestions
  useEffect(() => {
    api.get('/posts.php', { params: { limit: 24, status: 'all' } })
      .then(res => setCategories([...new Set((res.data.posts || []).map(p => p.category).filter(Boolean))].sort()))
      .catch(() => {});
  }, []);

  const dirty = useMemo(
    () => FIELDS.some(k => (form[k] ?? '') !== (saved[k] ?? '')) || Boolean(coverFile) || removeCover,
    [form, saved, coverFile, removeCover],
  );

  // Warn before closing the tab with unsaved work
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // Local preview URL for a newly chosen cover
  const [coverPreview, setCoverPreview] = useState(null);
  useEffect(() => {
    if (!coverFile) { setCoverPreview(null); return; }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);
  const coverSrc = coverPreview || (!removeCover && meta.cover ? assetUrl(meta.cover) : null);

  const save = useCallback(async (statusOverride) => {
    const values = { ...form, status: statusOverride || form.status };
    if (!values.title.trim()) { setToast({ type: 'error', message: 'Give the post a title first.' }); return; }
    if (!hasBody(values.content)) { setToast({ type: 'error', message: 'Write the post content before saving.' }); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      FIELDS.forEach(k => {
        // Only send the publish date when it changed, so editing a post keeps its original time of day.
        if (k === 'published_at' && !isNew && values.published_at === saved.published_at) return;
        fd.append(k, values[k] ?? '');
      });
      if (coverFile) fd.append('cover_image', await resizeImage(coverFile));
      else if (removeCover) fd.append('remove_cover', '1');
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (isNew) {
        const res = await api.post('/posts.php', fd, cfg);
        const message = saveMessage(values, false);
        setSaved(values); // clears the unsaved-changes guard before leaving
        navigate(`/admin/posts/${res.data.id}`, { replace: true, state: { toast: { type: 'success', message } } });
        return;
      }
      await api.post(`/posts.php?id=${id}&_method=PUT`, fd, cfg);
      const fresh = await api.get('/posts.php', { params: { id } });
      setMeta(m => ({ ...m, cover: fresh.data.post.cover_image }));
      // the server fills an empty publish date with "now"
      const synced = { ...values, published_at: toDay(fresh.data.post.published_at) };
      setForm(synced);
      setSaved(synced);
      setCoverFile(null);
      setRemoveCover(false);
      setToast({ type: 'success', message: saveMessage(values, saved.status === 'published' && !isFuture(saved.published_at)) });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save post.' });
    } finally {
      setSaving(false);
    }
  }, [form, saved, coverFile, removeCover, isNew, id, navigate]);

  // Ctrl/Cmd + S saves
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
    if (!confirm('Delete this post? This cannot be undone.')) return;
    await api.delete(`/posts.php?id=${id}`);
    setSaved(form);
    navigate('/admin/posts', { replace: true });
  }

  function chooseCover(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCoverFile(file);
    setRemoveCover(false);
  }

  if (loading) return <div className="admin-loading">Loading post…</div>;
  // Never show an empty form for a post that failed to load: saving it would wipe the post.
  if (loadError) {
    return (
      <div className="pe-error">
        <h2>That post could not be loaded.</h2>
        <p>It may have been deleted, or the connection dropped. Nothing was changed.</p>
        <Link to="/admin/posts" className="btn btn-primary"><FaArrowLeft /> Back to all posts</Link>
      </div>
    );
  }

  const isDraft = form.status === 'draft';
  const scheduled = !isDraft && isFuture(form.published_at);
  const savedScheduled = saved.status === 'published' && isFuture(saved.published_at);
  const primaryLabel = saving ? 'Saving…'
    : isDraft ? 'Save draft'
    : scheduled ? (!isNew && savedScheduled ? 'Update' : 'Schedule')
    : isNew || saved.status === 'draft' || savedScheduled ? 'Publish' : 'Update';
  const savedLabel = saved.status === 'draft' ? 'Draft · saved' : savedScheduled ? 'Scheduled · saved' : 'Published · saved';
  const typeLabel = TYPES.find(t => t.value === form.type)?.label;
  const cardDate = formatDate(form.type === 'event' && form.event_date ? form.event_date : (form.published_at || new Date().toISOString()));
  const words = wordCount(form.content);

  return (
    <form className="pe" onSubmit={e => { e.preventDefault(); save(); }}>
      {/* ---------- top bar ---------- */}
      <div className="pe-topbar">
        <Link to="/admin/posts" className="pe-back" onClick={leave}><FaArrowLeft /> All posts</Link>
        <div className="pe-topbar-title">
          <h2>{isNew ? 'New post' : 'Edit post'}</h2>
          <span className={`pe-state ${dirty ? 'is-dirty' : ''}`}>
            {dirty ? 'Unsaved changes' : isNew ? 'Not saved yet' : savedLabel}
          </span>
        </div>
        <div className="pe-topbar-actions">
          {isNew || !meta.slug ? (
            <span className="btn btn-outline btn-sm is-disabled" aria-disabled="true" title="Save the post first to view it on the site">
              View site <FaExternalLinkAlt />
            </span>
          ) : (
            <a
              className="btn btn-outline btn-sm"
              href={`/news-blog/${meta.slug}`}
              target="_blank"
              rel="noreferrer"
              title={dirty ? 'Opens the last saved version; save to see your latest changes' : 'Open the article in a new tab'}
            >
              View site <FaExternalLinkAlt />
            </a>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>{primaryLabel}</button>
        </div>
      </div>

      <div className="pe-layout">
        {/* ---------- main column ---------- */}
        <div className="pe-main">
          <label className="sr-only" htmlFor="pe-title">Title</label>
          <textarea
            id="pe-title"
            className="pe-title"
            rows={1}
            placeholder="Post title"
            value={form.title}
            onChange={e => set('title', e.target.value.replace(/\n/g, ' '))}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`; }}
            ref={el => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
          />

          <div className="pe-field">
            <div className="pe-field-head">
              <label htmlFor="pe-summary">Short description</label>
              <span className={`pe-count ${form.short_description.length > SUMMARY_MAX - 40 ? 'is-near' : ''}`}>
                {form.short_description.length}/{SUMMARY_MAX}
              </span>
            </div>
            <textarea
              id="pe-summary"
              rows={3}
              maxLength={SUMMARY_MAX}
              value={form.short_description}
              onChange={e => set('short_description', e.target.value)}
              placeholder="One or two sentences shown on news cards and under the article title."
            />
          </div>

          <div className="pe-field">
            <div className="pe-field-head">
              <span className="pe-label">Article</span>
              <span className="pe-count">{words} word{words === 1 ? '' : 's'} · ~{Math.max(1, Math.round(words / 200))} min read</span>
            </div>
            <RichTextEditor
              value={form.content}
              onChange={content => set('content', content)}
              onError={message => setToast({ type: 'error', message })}
            />
          </div>
        </div>

        {/* ---------- sidebar ---------- */}
        <aside className="pe-side">
          <section className="pe-panel">
            <h3>Publish</h3>
            <div className="pe-segment" role="radiogroup" aria-label="Status">
              {[['published', 'Published'], ['draft', 'Draft']].map(([value, label]) => (
                <button key={value} type="button" role="radio" aria-checked={form.status === value}
                  className={form.status === value ? 'is-on' : ''} onClick={() => set('status', value)}>{label}</button>
              ))}
            </div>
            <div className="form-row">
              <label htmlFor="pe-published-at">Publish date</label>
              <div className="pe-date-row">
                <input
                  id="pe-published-at"
                  type="date"
                  value={form.published_at}
                  onChange={e => set('published_at', e.target.value)}
                />
                {form.published_at && (
                  <button type="button" className="pe-link" onClick={() => set('published_at', '')}>Use today</button>
                )}
              </div>
            </div>
            <p className={`pe-hint ${scheduled ? 'pe-hint-scheduled' : ''}`}>
              {isDraft
                ? 'Drafts are only visible here in the admin.'
                : scheduled
                  ? `Scheduled: goes live on ${formatDate(form.published_at, LONG_DATE)}. Hidden from the site until then.`
                  : form.published_at
                    ? 'Shown on the site with this date. Pick a future date to schedule it.'
                    : 'Empty means it publishes today. Pick a past date to backdate, or a future date to schedule.'}
            </p>
            {!isNew && (
              <button type="button" className="pe-delete" onClick={handleDelete}><FaTrash /> Delete post</button>
            )}
          </section>

          <section className="pe-panel">
            <h3>Details</h3>
            <span className="pe-label">Type</span>
            <div className="pe-segment pe-segment-3" role="radiogroup" aria-label="Type">
              {TYPES.map(t => (
                <button key={t.value} type="button" role="radio" aria-checked={form.type === t.value}
                  className={form.type === t.value ? 'is-on' : ''} onClick={() => set('type', t.value)}>{t.label}</button>
              ))}
            </div>
            <div className="form-row">
              <label htmlFor="pe-category">Category</label>
              <input id="pe-category" list="pe-categories" value={form.category} onChange={e => set('category', e.target.value)} placeholder="e.g. Livelihood" />
              <datalist id="pe-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="form-row">
              <label htmlFor="pe-author">Author</label>
              <input id="pe-author" value={form.author} onChange={e => set('author', e.target.value)} />
            </div>
            {form.type === 'event' && (
              <>
                <div className="form-row">
                  <label htmlFor="pe-event-date">Event date &amp; time</label>
                  <input id="pe-event-date" type="datetime-local" value={form.event_date} onChange={e => set('event_date', e.target.value)} />
                </div>
                <div className="form-row">
                  <label htmlFor="pe-event-venue">Venue</label>
                  <input id="pe-event-venue" value={form.event_venue} onChange={e => set('event_venue', e.target.value)} placeholder="e.g. Community Hall, Bacolod City" />
                </div>
              </>
            )}
          </section>

          <section className="pe-panel">
            <h3>Cover photo</h3>
            {coverSrc ? (
              <div className="pe-cover">
                <img src={coverSrc} alt="Cover preview" />
                <div className="pe-cover-actions">
                  <button type="button" className="btn btn-sm" onClick={() => coverInput.current?.click()}>Replace</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setCoverFile(null); setRemoveCover(Boolean(meta.cover)); }}>Remove</button>
                </div>
              </div>
            ) : (
              <button type="button" className="pe-cover-drop" onClick={() => coverInput.current?.click()}>
                <FaImage />
                <span>Choose a cover photo</span>
                <span className="mono">JPG, PNG or WEBP · resized automatically</span>
              </button>
            )}
            <input ref={coverInput} type="file" accept="image/png, image/jpeg, image/webp" hidden onChange={chooseCover} />
          </section>

          <section className="pe-panel pe-panel-preview">
            <h3>Card preview</h3>
            <p className="pe-hint">How this post appears on the News page.</p>
            <div className={`post-card post-card-${form.type} pe-card`}>
              <div className="post-card-image">
                {coverSrc ? <img src={coverSrc} alt="" /> : <div className="post-card-placeholder" />}
                <span className="post-card-type mono">{typeLabel}</span>
              </div>
              <div className="post-card-body">
                <span className="mono post-card-meta">{[form.category, cardDate].filter(Boolean).join(' · ')}</span>
                <h3>{form.title || 'Post title'}</h3>
                {form.short_description
                  ? <p>{form.short_description}</p>
                  : <p className="pe-muted">Add a short description so the card has a summary.</p>}
                {form.author && <span className="mono post-card-author">By {form.author}</span>}
              </div>
            </div>
          </section>
        </aside>
      </div>

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </form>
  );
}

// /admin/posts/new and /admin/posts/:id share this component; keying by id
// gives each post a fresh editor (and picks up the "saved" toast) after the
// first save moves the URL from /new to the new post's id.
export default function PostEditor() {
  const { id } = useParams();
  return <PostEditorForm key={id || 'new'} />;
}
