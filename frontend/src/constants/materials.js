// Mirrors the ENUM in the `materials` table (backend/schema.sql).
export const MATERIAL_TYPES = [
  { value: 'module', label: 'Module', plural: 'Modules' },
  { value: 'report', label: 'Report', plural: 'Reports' },
  { value: 'poster', label: 'Poster / IEC', plural: 'Posters & IEC' },
  { value: 'policy', label: 'Policy', plural: 'Policies' },
  { value: 'other', label: 'Other', plural: 'Other' },
];
