import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FaTachometerAlt, FaNewspaper, FaUsers, FaMapMarkedAlt,
  FaHandsHelping, FaEnvelopeOpenText, FaSignOutAlt, FaGlobe, FaSitemap, FaCog,
  FaImages, FaBookOpen, FaFolderOpen, FaBars, FaTimes,
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/axios';
import './AdminLayout.css';
import logo from '../../assets/logo/cajdencoloredlongwhite.png';

// ManageMessages dispatches this (detail = unread count) whenever its list changes.
export const UNREAD_EVENT = 'admin:unread-messages';
const UNREAD_POLL_MS = 60_000;

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: FaTachometerAlt, end: true },
  { to: '/admin/posts', label: 'News / Blog / Events', icon: FaNewspaper },
  { to: '/admin/officers', label: 'Officers Positions', icon: FaUsers },
  { to: '/admin/partners', label: 'FBPOs', icon: FaSitemap },
  { to: '/admin/offices', label: 'Office & FBPOs', icon: FaMapMarkedAlt },
  { to: '/admin/services', label: 'Programs', icon: FaHandsHelping },
  { to: '/admin/albums', label: 'Photo Albums', icon: FaImages },
  { to: '/admin/enews', label: 'E-News', icon: FaBookOpen },
  { to: '/admin/materials', label: 'Materials', icon: FaFolderOpen },
  { to: '/admin/messages', label: 'Contact Messages', icon: FaEnvelopeOpenText },
  { to: '/admin/settings', label: 'Settings', icon: FaCog },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // Unread contact messages: refresh on navigation, every minute, when the tab
  // regains focus, and instantly when the Messages page reports a change.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      api.get('/admin/messages.php', { params: { unread_count: 1 } })
        .then(res => setUnread(Number(res.data.unread) || 0))
        .catch(() => {});
    };
    refresh();
    const timer = setInterval(refresh, UNREAD_POLL_MS);
    const onReport = e => setUnread(e.detail);
    window.addEventListener(UNREAD_EVENT, onReport);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener(UNREAD_EVENT, onReport);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [location.pathname]);

  // Close the mobile drawer after navigating, and on Escape.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = e => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  async function handleLogout() {
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (!confirmed) return;
    await logout();
    navigate('/admin/login');
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${menuOpen ? 'is-open' : ''}`} id="admin-sidebar">
        <img src={logo} alt="cajden" className="admin-logo" />
        <nav className="admin-nav">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
              <item.icon /> {item.label}
              {item.to === '/admin/messages' && unread > 0 && (
                <span className="admin-nav-badge" aria-label={`${unread} unread`}>{unread > 99 ? '99+' : unread}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <a href="/" target="_blank" rel="noreferrer" className="admin-nav-link"><FaGlobe /> View Website</a>
          <button className="admin-nav-link admin-logout" onClick={handleLogout}><FaSignOutAlt /> Logout</button>
        </div>
      </aside>

      {menuOpen && <div className="admin-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <main className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-menu-btn"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="admin-sidebar"
          >
            {menuOpen ? <FaTimes /> : <FaBars />}
            {!menuOpen && unread > 0 && <span className="admin-menu-dot" aria-hidden="true" />}
          </button>
          <span>Welcome back, {admin?.full_name || admin?.username}</span>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
