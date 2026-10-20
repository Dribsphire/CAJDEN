// Some older records were saved with HTML entities (e.g. "people&#039;s"),
// so text from the API is decoded before display.
export function decodeHtml(text) {
  if (!text || !/&[#a-z0-9]+;/i.test(text)) return text || '';
  const el = document.createElement('textarea');
  el.innerHTML = text;
  return el.value;
}

// Decodes every string field of a record (for admin edit forms), so older
// entity-encoded values don't get saved back with "&amp;" in them.
export function decodeRecord(record) {
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, typeof v === 'string' ? decodeHtml(v) : v]));
}

export function formatBytes(bytes) {
  const n = Number(bytes);
  if (!n) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// MySQL can hand back "0000-00-00 ..." for unset dates; treat those as empty.
function parseDate(value) {
  if (!value || String(value).startsWith('0000')) return null;
  const d = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const d = parseDate(value);
  return d ? d.toLocaleDateString('en-US', opts) : '';
}

// "Mar 2026" style, as used on cards and labels
export function formatMonthYear(value) {
  return formatDate(value, { month: 'short', year: 'numeric' });
}

// Events are dated by when they happen; everything else by when it was posted.
export function postDate(post) {
  const eventDate = post.type === 'event' && parseDate(post.event_date) ? post.event_date : null;
  return eventDate || post.published_at;
}

export function fileExtension(path) {
  const m = /\.([a-z0-9]+)$/i.exec(path || '');
  return m ? m[1].toUpperCase() : 'FILE';
}
