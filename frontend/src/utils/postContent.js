import DOMPurify from 'dompurify';
import { UPLOADS_BASE } from '../api/axios';

// Post bodies used to be plain text (one paragraph per line). The editor now
// saves HTML. Images inside the body are stored with a relative
// "uploads/..." src so content keeps working if the API host changes.

const HTML_HINT = /<\/?(p|h[1-6]|ul|ol|li|blockquote|strong|em|u|s|a|img|br|hr)\b/i;
const UPLOADS_PREFIX = `${UPLOADS_BASE.replace(/\/$/, '')}/uploads/`;

export function isHtmlContent(content) {
  return HTML_HINT.test(content || '');
}

function escapeHtml(text) {
  const el = document.createElement('div');
  el.textContent = text;
  return el.innerHTML;
}

// Legacy plain text -> paragraphs. Some old rows were saved entity-encoded,
// so decode first, then escape properly.
function plainToHtml(text) {
  const decoder = document.createElement('textarea');
  decoder.innerHTML = text || '';
  return decoder.value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

const expandUploads = html => html.replace(/(src=["'])uploads\//g, `$1${UPLOADS_PREFIX}`);

/** Stored content -> HTML the editor can load. */
export function toEditorHtml(content) {
  return expandUploads(isHtmlContent(content) ? content : plainToHtml(content));
}

/** Editor HTML -> what gets stored. */
export function fromEditorHtml(html) {
  const stored = html.split(UPLOADS_PREFIX).join('uploads/');
  return stored === '<p></p>' ? '' : stored;
}

const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'hr', 'img'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
};

// External links open in a new tab and can't reach back into this page.
DOMPurify.addHook('afterSanitizeAttributes', node => {
  if (node.tagName === 'A' && node.getAttribute('href')) {
    const href = node.getAttribute('href');
    if (/^https?:\/\//i.test(href) && !href.startsWith(window.location.origin)) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  }
  if (node.tagName === 'IMG') node.setAttribute('loading', 'lazy');
});

/** Stored content -> safe HTML for the public article page. */
export function renderPostHtml(content) {
  return DOMPurify.sanitize(toEditorHtml(content), PURIFY_CONFIG);
}

/** Editor HTML (or legacy plain text) -> plain text, e.g. for summaries. */
export function plainText(content) {
  const el = document.createElement('div');
  el.innerHTML = DOMPurify.sanitize(toEditorHtml(content), { ALLOWED_TAGS: ['p', 'br', 'li'] });
  el.querySelectorAll('p, li, br').forEach(n => n.after(' '));
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}
