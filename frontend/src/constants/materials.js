import { API_BASE } from '../api/axios';
import { fileExtension } from '../utils/format.js';

// Mirrors the ENUM in the `materials` table (backend/schema.sql).
export const MATERIAL_TYPES = [
  { value: 'module', label: 'Module', plural: 'Modules' },
  { value: 'report', label: 'Report', plural: 'Reports' },
  { value: 'poster', label: 'Poster / IEC', plural: 'Posters & IEC' },
  { value: 'policy', label: 'Policy', plural: 'Policies' },
  { value: 'other', label: 'Other', plural: 'Other' },
];

// Offered as quick picks in the admin; any other language can be typed in.
export const COMMON_LANGUAGES = ['English', 'Hiligaynon', 'Filipino', 'Cebuano'];

export const materialTypeLabel = value => MATERIAL_TYPES.find(t => t.value === value)?.label || value;

export const isLinkMaterial = m => Boolean(m.external_url) && !m.file_path;

// Public downloads go through the API so they're counted, then redirect to the file or link.
export const materialHref = m => `${API_BASE}/materials.php?download=${m.id}`;

// "PDF", "DOCX" … or "Link" / the link's site for external materials
export function materialFormat(m) {
  if (!isLinkMaterial(m)) return fileExtension(m.file_path);
  try {
    const host = new URL(m.external_url).hostname.replace(/^www\./, '');
    if (/drive\.google|docs\.google/.test(host)) return 'Google Drive';
    if (/youtube|youtu\.be/.test(host)) return 'YouTube';
    if (/canva/.test(host)) return 'Canva';
    return 'Link';
  } catch {
    return 'Link';
  }
}
