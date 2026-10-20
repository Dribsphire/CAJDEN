import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaChevronDown, FaArrowRight } from 'react-icons/fa';
import logo from '../assets/logo/cajden-seal-256.png';
import Hablon from './Hablon.jsx';
import './Navbar.css';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Programs' },
  { to: '/news-blog', label: 'News' },
];

export const RESOURCE_LINKS = [
  { to: '/photos', label: 'Photos', note: 'Albums from the field' },
  { to: '/e-news', label: 'E-News', note: 'Our newsletter' },
  { to: '/materials', label: 'Materials', note: 'Modules, reports, posters' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const inResources = RESOURCE_LINKS.some(r => location.pathname.startsWith(r.to));

  // Close menus whenever the route changes
  useEffect(() => { setOpen(false); setResourcesOpen(false); }, [location.pathname]);

  // Lock page scroll behind the mobile menu
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!resourcesOpen) return;
    const onDown = e => { if (!dropdownRef.current?.contains(e.target)) setResourcesOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setResourcesOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [resourcesOpen]);

  return (
    <header className="navbar">
      <Hablon height={10} />
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand" aria-label="CAJDEN Inc. home">
          <img src={logo} alt="" className="navbar-seal" />
          <span className="navbar-name">
            <strong>CAJDEN</strong>
            <span>Christian Advocates for Justice &amp; Development in Negros</span>
          </span>
        </Link>

        <nav className={`navbar-links ${open ? 'is-open' : ''}`} aria-label="Main">
          {LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}

          <div
            className={`navbar-dropdown ${resourcesOpen ? 'is-open' : ''}`}
            ref={dropdownRef}
            onMouseEnter={() => setResourcesOpen(true)}
            onMouseLeave={() => setResourcesOpen(false)}
          >
            <button
              type="button"
              className={`navbar-link navbar-dropdown-toggle ${inResources ? 'active' : ''}`}
              aria-expanded={resourcesOpen}
              aria-controls="resources-menu"
              // Hover already opened it for mouse users, so a mouse click keeps it
              // open; keyboard activation (detail === 0) toggles.
              onClick={e => setResourcesOpen(o => (e.detail === 0 ? !o : true))}
            >
              Resources <FaChevronDown aria-hidden="true" />
            </button>
            <div className="navbar-dropdown-menu" id="resources-menu">
              {RESOURCE_LINKS.map(r => (
                <NavLink key={r.to} to={r.to} className="navbar-dropdown-item">
                  <span className="poster">{r.label}</span>
                  <span className="mono">{r.note}</span>
                </NavLink>
              ))}
            </div>
          </div>

          <NavLink to="/contact" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
            Contact
          </NavLink>

          <Link to="/contact" className="btn btn-sun navbar-cta">
            Get involved <FaArrowRight aria-hidden="true" />
          </Link>
        </nav>

        <button
          className="navbar-toggle"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <FaTimes /> : <FaBars />}
        </button>
      </div>
    </header>
  );
}
