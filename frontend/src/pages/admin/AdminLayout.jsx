import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FaTachometerAlt, FaNewspaper, FaUsers, FaMapMarkedAlt,
  FaHandsHelping, FaEnvelopeOpenText, FaSignOutAlt, FaGlobe, FaSitemap, FaCog,
  FaImages, FaBookOpen, FaFolderOpen,
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext.jsx';
import './AdminLayout.css';
import logo from '../../assets/logo/cajdencoloredlongwhite.png';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: FaTachometerAlt, end: true },
  { to: '/admin/posts', label: 'News / Blog / Events', icon: FaNewspaper },
  { to: '/admin/officers', label: 'Officers Positions', icon: FaUsers },
  { to: '/admin/partners', label: 'FBPOs', icon: FaSitemap },
  { to: '/admin/offices', label: 'Office & FBPOs', icon: FaMapMarkedAlt },
  { to: '/admin/services', label: 'Services', icon: FaHandsHelping },
  { to: '/admin/albums', label: 'Photo Albums', icon: FaImages },
  { to: '/admin/enews', label: 'E-News', icon: FaBookOpen },
  { to: '/admin/materials', label: 'Materials', icon: FaFolderOpen },
  { to: '/admin/messages', label: 'Contact Messages', icon: FaEnvelopeOpenText },
  { to: '/admin/settings', label: 'Settings', icon: FaCog },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (!confirmed) return;
    await logout();
    navigate('/admin/login');
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <img src={logo} alt="cajden" className="admin-logo" />
        <nav className="admin-nav">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
              <item.icon /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <a href="/" target="_blank" rel="noreferrer" className="admin-nav-link"><FaGlobe /> View Website</a>
          <button className="admin-nav-link admin-logout" onClick={handleLogout}><FaSignOutAlt /> Logout</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <span>Welcome back, {admin?.full_name || admin?.username}</span>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
