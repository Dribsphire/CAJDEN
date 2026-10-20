import { decodeHtml } from './format.js';

const HONORIFICS = /^(rev|fr|msgr|sr|br|ms|mr|mrs|dr|engr|atty|hon|ma)\.?$/i;
const SUFFIXES = /^(jr|sr|ii|iii|iv)\.?$/i;

// "MS. MARIBEL GONZALES, RSW, MSSW" -> { name: "MS. MARIBEL GONZALES", credentials: "RSW, MSSW" }
export function splitName(fullName) {
  const text = decodeHtml(fullName || '').trim();
  const comma = text.indexOf(',');
  if (comma === -1) return { name: text, credentials: '' };
  return { name: text.slice(0, comma).trim(), credentials: text.slice(comma + 1).trim() };
}

// Initials from the first and last real name words, skipping titles like REV. / FR. / DR.
export function initials(name) {
  const words = (name || '').split(/\s+/).filter(w => w && !HONORIFICS.test(w) && !SUFFIXES.test(w));
  if (!words.length) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}
