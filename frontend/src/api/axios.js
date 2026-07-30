import axios from 'axios';

// Configured in frontend/.env (see .env.example). Falls back to sensible
// XAMPP defaults if no .env file is present.
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost/ngo-project/backend/api';
export const UPLOADS_BASE = import.meta.env.VITE_UPLOADS_BASE || 'http://localhost/ngo-project/backend';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // sends PHP session cookie for admin auth
});

// Helper to build a full URL for an uploaded image path stored in MySQL.
export function assetUrl(path) {
  if (!path) return null;
  return `${UPLOADS_BASE}/${path}`;
}

export default api;
