import { useEffect, useState } from 'react';
import { FaSave, FaKey, FaUserCog, FaGlobeAmericas } from 'react-icons/fa';
import api from '../../api/axios';
import Toast from '../../components/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import './ManageSettings.css';

const SITE_FIELDS = [
  { key: 'org_name', label: 'Organization Name', type: 'text' },
  { key: 'org_email', label: 'Organization Email', type: 'email' },
  { key: 'org_phone', label: 'Organization Phone', type: 'text' },
  { key: 'org_address', label: 'Office Address', type: 'text' },
  { key: 'facebook_url', label: 'Facebook URL', type: 'text' },
  { key: 'mission', label: 'Mission', type: 'textarea' },
  { key: 'vision', label: 'Vision', type: 'textarea' },
];

const TABS = [
  { id: 'site', label: 'Site Settings', icon: FaGlobeAmericas },
  { id: 'profile', label: 'My Profile', icon: FaUserCog },
  { id: 'password', label: 'Change Password', icon: FaKey },
];

export default function ManageSettings() {
  const [activeTab, setActiveTab] = useState('site');
  const [toast, setToast] = useState(null);

  return (
    <>
      <div className="admin-page-header">
        <h2>Admin Settings</h2>
      </div>

      <div className="settings-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <tab.icon /> {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-panel">
        {activeTab === 'site' && <SiteSettingsForm setToast={setToast} />}
        {activeTab === 'profile' && <ProfileForm setToast={setToast} />}
        {activeTab === 'password' && <ChangePasswordForm setToast={setToast} />}
      </div>

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}

// ---------------------------------------------------------
// Site-wide settings (org name, contact info, mission, vision…)
// ---------------------------------------------------------
function SiteSettingsForm({ setToast }) {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.get('/settings.php')
      .then(res => setForm(res.data.settings || {}))
      .catch(() => setToast({ type: 'error', message: 'Failed to load settings.' }))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings.php', form);
      setToast({ type: 'success', message: 'Site settings updated.' });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading…</p>;

  return (
    <form className="settings-card" onSubmit={handleSubmit}>
      <h3>Site Settings</h3>
      <p className="settings-hint">These values are shown across the public website (home page, footer, about page, and contact page).</p>

      {SITE_FIELDS.map(field => (
        <div className="form-row" key={field.key}>
          <label>{field.label}</label>
          {field.type === 'textarea' ? (
            <textarea
              rows="3"
              value={form[field.key] || ''}
              onChange={e => setForm({ ...form, [field.key]: e.target.value })}
            />
          ) : (
            <input
              type={field.type}
              value={form[field.key] || ''}
              onChange={e => setForm({ ...form, [field.key]: e.target.value })}
            />
          )}
        </div>
      ))}

      <div className="modal-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <FaSave /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------
// Admin's own account info (full name, email)
// ---------------------------------------------------------
function ProfileForm({ setToast }) {
  const [form, setForm] = useState({ username: '', full_name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.get('/admin/profile.php')
      .then(res => setForm(res.data.admin || {}))
      .catch(() => setToast({ type: 'error', message: 'Failed to load profile.' }))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/profile.php', { full_name: form.full_name, email: form.email });
      setToast({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading…</p>;

  return (
    <form className="settings-card" onSubmit={handleSubmit}>
      <h3>My Profile</h3>
      <p className="settings-hint">This information identifies you as an administrator of this system.</p>

      <div className="form-row">
        <label>Username</label>
        <input value={form.username || ''} disabled />
      </div>
      <div className="form-row">
        <label>Full Name</label>
        <input
          value={form.full_name || ''}
          onChange={e => setForm({ ...form, full_name: e.target.value })}
          required
        />
      </div>
      <div className="form-row">
        <label>Email</label>
        <input
          type="email"
          value={form.email || ''}
          onChange={e => setForm({ ...form, email: e.target.value })}
          required
        />
      </div>

      <div className="modal-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <FaSave /> {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------
// Change password
// ---------------------------------------------------------
function ChangePasswordForm({ setToast }) {
  const { logout } = useAuth();
  const EMPTY = { current_password: '', new_password: '', confirm_password: '' };
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (form.new_password.length < 8) {
      setToast({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setToast({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    setSaving(true);
    try {
      await api.post('/admin/change_password.php', form);
      setToast({ type: 'success', message: 'Password changed. Please log in again.' });
      setForm(EMPTY);
      // Session is destroyed server-side after a password change — send the admin back to login.
      setTimeout(() => {
        logout().finally(() => { window.location.href = '/admin/login'; });
      }, 1200);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="settings-card" onSubmit={handleSubmit}>
      <h3>Change Password</h3>
      <p className="settings-hint">Choose a strong password with at least 8 characters. You'll be logged out after changing it.</p>

      <div className="form-row">
        <label>Current Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={form.current_password}
          onChange={e => setForm({ ...form, current_password: e.target.value })}
          required
        />
      </div>
      <div className="form-row">
        <label>New Password</label>
        <input
          type="password"
          autoComplete="new-password"
          value={form.new_password}
          onChange={e => setForm({ ...form, new_password: e.target.value })}
          required
        />
      </div>
      <div className="form-row">
        <label>Confirm New Password</label>
        <input
          type="password"
          autoComplete="new-password"
          value={form.confirm_password}
          onChange={e => setForm({ ...form, confirm_password: e.target.value })}
          required
        />
      </div>

      <div className="modal-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <FaKey /> {saving ? 'Updating…' : 'Update Password'}
        </button>
      </div>
    </form>
  );
}
