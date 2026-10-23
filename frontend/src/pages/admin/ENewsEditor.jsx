import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft, FaExternalLinkAlt, FaImage, FaTrash, FaFilePdf, FaPlus, FaTimes, FaArrowUp, FaArrowDown, FaExclamationTriangle, FaPaperPlane,
} from 'react-icons/fa';
import api, { assetUrl } from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { IssueCover, IssueTile, issueHighlights } from '../../components/IssueCover.jsx';
import { resizeImage } from '../../utils/resizeImage.js';
import { decodeHtml, formatBytes, formatDate } from '../../utils/format.js';
import './PostEditor.css';
import './ENewsEditor.css';

const PDF_MAX = 30 * 1024 * 1024; // matches handleDocumentUpload on the server
const SUMMARY_MAX = 600;
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = { issue_number: '', title: '', period_label: '', published_on: today(), summary: '', is_published: '1' };
const FIELDS = Object.keys(EMPTY);

function ENewsEditorForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState(EMPTY);
  const [stories, setStories] = useState(['']);         // "In this issue", one entry per story
  const [saved, setSaved] = useState({ ...EMPTY, highlights: '' });
  const [stored, setStored] = useState({ cover: null, pdf: null, size: null });
  const [mailing, setMailing] = useState({ at: null, count: 0, subscribers: 0, sending: false });
  const [coverFile, setCoverFile] = useState(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [numbers, setNumbers] = useState([]);           // issue numbers already used by other issues
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(location.state?.toast || null);
  const coverInput = useRef(null);
  const pdfInput = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const highlights = stories.map(s => s.trim()).filter(Boolean).join('\n');

  useEffect(() => {
    const requests = [api.get('/enews.php', { params: { all: 1 } })];
    if (!isNew) requests.push(api.get('/enews.php', { params: { id } }));
    Promise.all(requests)
      .then(([all, one]) => {
        const list = all.data.issues || [];
        setNumbers(list.filter(i => String(i.id) !== String(id)).map(i => Number(i.issue_number)));
        if (isNew) {
          // Suggest the next number after the highest one so far
          const next = list.length ? Math.max(...list.map(i => Number(i.issue_number))) + 1 : 1;
          setForm(f => ({ ...f, issue_number: String(next) }));
          setSaved(s => ({ ...s, issue_number: String(next) }));
          return;
        }
        const issue = one.data.issue;
        const values = {
          issue_number: String(issue.issue_number),
          title: decodeHtml(issue.title),
          period_label: decodeHtml(issue.period_label || ''),
          published_on: issue.published_on || today(),
          summary: decodeHtml(issue.summary || ''),
          is_published: String(Number(issue.is_published)),
        };
        const lines = issueHighlights(issue.highlights);
        setForm(values);
        setStories(lines.length ? lines : ['']);
        setSaved({ ...values, highlights: lines.join('\n') });
        setStored({ cover: issue.cover_image, pdf: issue.pdf_path, size: issue.file_size });
        setMailing(m => ({ ...m, at: issue.emailed_at, count: Number(issue.emailed_count || 0) }));
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  useEffect(() => {
    if (isNew) return;
    api.get('/enews_subscribe.php').then(res => setMailing(m => ({ ...m, subscribers: (res.data.subscribers || []).length }))).catch(() => {});
  }, [isNew]);

  async function emailSubscribers() {
    const again = mailing.at ? ' It was already emailed once; subscribers will get it again.' : '';
    if (!confirm(`Email Issue No. ${saved.issue_number} to ${mailing.subscribers} subscriber${mailing.subscribers === 1 ? '' : 's'}?${again}`)) return;
    setMailing(m => ({ ...m, sending: true }));
    try {
      const res = await api.post(`/enews.php?action=send&id=${id}`);
      setMailing(m => ({ ...m, at: new Date().toISOString(), count: res.data.sent, sending: false }));
      setToast({ type: 'success', message: res.data.message });
    } catch (err) {
      setMailing(m => ({ ...m, sending: false }));
      setToast({ type: 'error', message: err.response?.data?.message || 'Sending failed.' });
    }
  }

  const dirty = useMemo(
    () => FIELDS.some(k => form[k] !== saved[k]) || highlights !== saved.highlights || Boolean(coverFile) || removeCover || Boolean(pdfFile),
    [form, saved, highlights, coverFile, removeCover, pdfFile],
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

  const numberClash = form.issue_number !== '' && numbers.includes(Number(form.issue_number));
  const hasPdf = Boolean(pdfFile || stored.pdf);
  const publishing = form.is_published === '1';

  const save = useCallback(async () => {
    if (!(Number(form.issue_number) >= 1)) { setToast({ type: 'error', message: 'Give the issue a number.' }); return; }
    if (numberClash) { setToast({ type: 'error', message: `Issue No. ${form.issue_number} already exists. Pick another number.` }); return; }
    if (!form.title.trim()) { setToast({ type: 'error', message: 'Add the cover headline.' }); return; }
    if (publishing && !hasPdf) { setToast({ type: 'error', message: 'Attach the newsletter PDF before publishing, or save it as a draft.' }); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      FIELDS.forEach(k => fd.append(k, form[k]));
      fd.append('highlights', highlights);
      if (coverFile) fd.append('cover', await resizeImage(coverFile));
      else if (removeCover) fd.append('remove_cover', '1');
      if (pdfFile) fd.append('pdf', pdfFile);
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
      const message = publishing ? `Issue No. ${form.issue_number} is published.` : 'Draft saved.';
      if (isNew) {
        const res = await api.post('/enews.php', fd, cfg);
        setSaved({ ...form, highlights });
        navigate(`/admin/enews/${res.data.id}`, { replace: true, state: { toast: { type: 'success', message } } });
        return;
      }
      await api.post(`/enews.php?id=${id}&_method=PUT`, fd, cfg);
      const fresh = (await api.get('/enews.php', { params: { id } })).data.issue;
      setStored({ cover: fresh.cover_image, pdf: fresh.pdf_path, size: fresh.file_size });
      setSaved({ ...form, highlights });
      setCoverFile(null); setRemoveCover(false); setPdfFile(null);
      setToast({ type: 'success', message });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save the issue.' });
    } finally {
      setSaving(false);
    }
  }, [form, highlights, coverFile, removeCover, pdfFile, isNew, id, navigate, numberClash, publishing, hasPdf]);

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
    if (!confirm(`Delete Issue No. ${saved.issue_number}? Its PDF and cover will be deleted too.`)) return;
    await api.delete(`/enews.php?id=${id}`);
    setSaved({ ...form, highlights });
    navigate('/admin/enews', { replace: true });
  }

  function choosePdf(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { setToast({ type: 'error', message: 'Choose a PDF file.' }); return; }
    if (f.size > PDF_MAX) { setToast({ type: 'error', message: `That PDF is ${formatBytes(f.size)}. The limit is 30 MB.` }); return; }
    setPdfFile(f);
  }

  // "In this issue" list editing
  const editStory = (i, v) => setStories(s => s.map((x, j) => (j === i ? v : x)));
  const addStory = () => setStories(s => [...s, '']);
  const removeStory = i => setStories(s => (s.length === 1 ? [''] : s.filter((_, j) => j !== i)));
  const moveStory = (i, step) => setStories(s => {
    const to = i + step;
    if (to < 0 || to >= s.length) return s;
    const next = [...s];
    [next[i], next[to]] = [next[to], next[i]];
    return next;
  });

  if (loading) return <div className="admin-loading">Loading issue…</div>;
  if (loadError) {
    return (
      <div className="pe-error">
        <h2>That issue could not be loaded.</h2>
        <p>It may have been deleted, or the connection dropped. Nothing was changed.</p>
        <Link to="/admin/enews" className="btn btn-primary"><FaArrowLeft /> Back to E-News</Link>
      </div>
    );
  }

  const savedPublished = saved.is_published === '1';
  const previewIssue = { ...form, highlights };

  return (
    <form className="pe" onSubmit={e => { e.preventDefault(); save(); }}>
      <div className="pe-topbar">
        <Link to="/admin/enews" className="pe-back" onClick={leave}><FaArrowLeft /> All issues</Link>
        <div className="pe-topbar-title">
          <h2>{isNew ? 'New issue' : `Issue No. ${saved.issue_number}`}</h2>
          <span className={`pe-state ${dirty ? 'is-dirty' : ''}`}>
            {dirty ? 'Unsaved changes' : isNew ? 'Not saved yet' : savedPublished ? 'Published · saved' : 'Draft · saved'}
          </span>
        </div>
        <div className="pe-topbar-actions">
          {isNew ? (
            <span className="btn btn-outline btn-sm is-disabled" aria-disabled="true" title="Save the issue first">View site <FaExternalLinkAlt /></span>
          ) : (
            <a className="btn btn-outline btn-sm" href={`/e-news/${saved.issue_number}`} target="_blank" rel="noreferrer"
              title={dirty ? 'Shows the last saved version' : 'Open the issue page in a new tab'}>
              View site <FaExternalLinkAlt />
            </a>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : !publishing ? 'Save draft' : isNew || !savedPublished ? 'Publish' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="pe-layout">
        <div className="pe-main">
          <div className="en-headrow">
            <div className="en-number">
              <label htmlFor="en-number">No.</label>
              <input id="en-number" type="number" min="1" value={form.issue_number} onChange={e => set('issue_number', e.target.value)} required />
            </div>
            <div className="en-title">
              <label className="sr-only" htmlFor="en-title">Cover headline</label>
              <textarea
                id="en-title" className="pe-title" rows={1} placeholder="Cover headline"
                value={form.title} onChange={e => set('title', e.target.value.replace(/\n/g, ' '))}
                ref={el => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
              />
            </div>
          </div>
          {numberClash && (
            <p className="ofc-warning ofc-warning-sm"><FaExclamationTriangle /> Issue No. {form.issue_number} already exists. Each issue needs its own number.</p>
          )}

          <div className="pe-field">
            <div className="pe-field-head">
              <label htmlFor="en-summary">Summary</label>
              <span className={`pe-count ${form.summary.length > SUMMARY_MAX - 40 ? 'is-near' : ''}`}>{form.summary.length}/{SUMMARY_MAX}</span>
            </div>
            <textarea id="en-summary" rows={3} maxLength={SUMMARY_MAX} value={form.summary} onChange={e => set('summary', e.target.value)}
              placeholder="A few sentences about what this issue covers." />
          </div>

          <div className="pe-field">
            <div className="pe-field-head">
              <span className="pe-label">In this issue</span>
              <span className="pe-count">{stories.filter(s => s.trim()).length} stories</span>
            </div>
            <ol className="en-stories">
              {stories.map((story, i) => (
                <li key={i}>
                  <span className="mono en-story-num">{String(i + 1).padStart(2, '0')}</span>
                  <input
                    value={story}
                    onChange={e => editStory(i, e.target.value.replace(/\n/g, ' '))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStory(); } }}
                    placeholder={i === 0 ? 'e.g. From the director: twelve years in our communities' : 'Story title'}
                    aria-label={`Story ${i + 1}`}
                    autoFocus={i > 0 && i === stories.length - 1 && !story}
                  />
                  <div className="en-story-actions">
                    <button type="button" className="icon-btn" onClick={() => moveStory(i, -1)} disabled={i === 0} aria-label="Move up"><FaArrowUp /></button>
                    <button type="button" className="icon-btn" onClick={() => moveStory(i, 1)} disabled={i === stories.length - 1} aria-label="Move down"><FaArrowDown /></button>
                    <button type="button" className="icon-btn danger" onClick={() => removeStory(i)} aria-label="Remove story"><FaTimes /></button>
                  </div>
                </li>
              ))}
            </ol>
            <button type="button" className="ofc-add en-add" onClick={addStory}><FaPlus /> Add story</button>
            <p className="pe-hint">Shown as the table of contents on the issue page. Press Enter to add the next story.</p>
          </div>

          <div className="pe-field">
            <span className="pe-label">Newsletter PDF</span>
            <div className={`en-pdf ${hasPdf ? 'has-file' : ''}`}>
              <FaFilePdf className="en-pdf-icon" />
              <div className="en-pdf-text">
                {pdfFile ? (
                  <><strong>{pdfFile.name}</strong><span className="mono">{formatBytes(pdfFile.size)} · uploads when you save</span></>
                ) : stored.pdf ? (
                  <><strong>Current PDF</strong><span className="mono">{formatBytes(stored.size)} · <a href={assetUrl(stored.pdf)} target="_blank" rel="noreferrer">open</a></span></>
                ) : (
                  <><strong>No PDF yet</strong><span className="mono">Required to publish · up to 30 MB</span></>
                )}
              </div>
              <div className="en-pdf-actions">
                <button type="button" className="btn btn-sm" onClick={() => pdfInput.current?.click()}>{hasPdf ? 'Replace' : 'Choose PDF'}</button>
                {pdfFile && <button type="button" className="pe-link" onClick={() => setPdfFile(null)}>Undo</button>}
              </div>
              <input ref={pdfInput} type="file" hidden accept="application/pdf,.pdf" onChange={choosePdf} />
            </div>
          </div>
        </div>

        <aside className="pe-side">
          <section className="pe-panel">
            <h3>Publish</h3>
            <div className="pe-segment" role="radiogroup" aria-label="Status">
              {[['1', 'Published'], ['0', 'Draft']].map(([value, label]) => (
                <button key={value} type="button" role="radio" aria-checked={form.is_published === value}
                  className={form.is_published === value ? 'is-on' : ''} onClick={() => set('is_published', value)}>{label}</button>
              ))}
            </div>
            <div className="form-row">
              <label htmlFor="en-date">Publication date</label>
              <input id="en-date" type="date" value={form.published_on} onChange={e => set('published_on', e.target.value)} />
            </div>
            <div className="form-row">
              <label htmlFor="en-period">Period label</label>
              <input id="en-period" value={form.period_label} onChange={e => set('period_label', e.target.value)} placeholder="e.g. Q1 2026 or March 2026" />
            </div>
            <p className={`pe-hint ${publishing && !hasPdf ? 'pe-hint-scheduled' : ''}`}>
              {!publishing
                ? 'Drafts stay in the admin until you publish them.'
                : !hasPdf
                  ? 'Attach the PDF to publish this issue.'
                  : 'The newest published issue is featured at the top of the E-News page.'}
            </p>
            {!isNew && <button type="button" className="pe-delete" onClick={handleDelete}><FaTrash /> Delete issue</button>}
          </section>

          {!isNew && savedPublished && (
            <section className="pe-panel">
              <h3>Email subscribers</h3>
              <p className="pe-hint">
                {mailing.at
                  ? `Emailed to ${mailing.count} subscriber${mailing.count === 1 ? '' : 's'} on ${formatDate(mailing.at, { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}.`
                  : `Not emailed yet. ${mailing.subscribers} subscriber${mailing.subscribers === 1 ? '' : 's'} will get the cover, summary, contents and a link to read it.`}
              </p>
              <button type="button" className="btn btn-sm en-send" onClick={emailSubscribers}
                disabled={mailing.sending || !mailing.subscribers || dirty}
                title={dirty ? 'Save your changes first' : !mailing.subscribers ? 'No subscribers yet' : ''}>
                <FaPaperPlane /> {mailing.sending ? 'Sending…' : mailing.at ? 'Send again' : `Send to ${mailing.subscribers}`}
              </button>
              {dirty && <p className="pe-hint">Save your changes before sending.</p>}
            </section>
          )}

          <section className="pe-panel">
            <h3>Front cover</h3>
            {coverSrc ? (
              <div className="pe-cover">
                <img src={coverSrc} alt="Front cover preview" className="en-cover-full" />
                <div className="pe-cover-actions">
                  <button type="button" className="btn btn-sm" onClick={() => coverInput.current?.click()}>Replace</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setCoverFile(null); setRemoveCover(Boolean(stored.cover)); }}>Remove</button>
                </div>
              </div>
            ) : (
              <button type="button" className="pe-cover-drop" onClick={() => coverInput.current?.click()}>
                <FaImage />
                <span>Choose the front cover</span>
                <span className="mono">The newsletter's cover page, as an image · shown uncropped</span>
              </button>
            )}
            <input ref={coverInput} type="file" hidden accept="image/png, image/jpeg, image/webp"
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setCoverFile(f); setRemoveCover(false); } }} />
          </section>

          <section className="pe-panel pe-panel-preview">
            <h3>Cover preview</h3>
            <div className="en-prev-cover"><IssueCover issue={previewIssue} coverSrc={coverSrc} /></div>
          </section>

          <section className="pe-panel pe-panel-preview">
            <h3>Archive tile</h3>
            <p className="pe-hint">How it looks under "Past issues" once a newer issue is out.</p>
            <div className="en-prev-tile">
              <IssueTile issue={previewIssue} coverSrc={coverSrc} />
              <span className="serif">{form.title || 'Cover headline'}</span>
            </div>
          </section>
        </aside>
      </div>

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </form>
  );
}

// New and edit share this component; key by id for a fresh editor after the first save.
export default function ENewsEditor() {
  const { id } = useParams();
  return <ENewsEditorForm key={id || 'new'} />;
}
