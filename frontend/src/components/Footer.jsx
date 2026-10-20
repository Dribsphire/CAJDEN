import { Link } from 'react-router-dom';
import { FaFacebook } from 'react-icons/fa';
import { useSettings } from '../hooks/useSettings.js';
import logo from '../assets/logo/cajden-seal-256.png';
import Hablon from './Hablon.jsx';
import './Footer.css';

export default function Footer() {
  const { settings } = useSettings();
  const orgName = settings.org_name || 'CAJDEN Inc.';

  return (
    <footer className="footer">
      <Hablon height={22} />
      <div className="container footer-grid">
        <div className="footer-lead">
          <img src={logo} alt="" className="footer-seal" />
          <p className="footer-org">Christian Advocates for Justice and Development in Negros, Inc.</p>
          <span className="mono footer-address">{settings.org_address || 'Bacolod City, Negros Occidental'}</span>
        </div>

        <div className="footer-col">
          <h4>Organization</h4>
          <Link to="/about">About us</Link>
          <Link to="/services">Programs</Link>
          <Link to="/contact">Offices &amp; FBPOs</Link>
          <Link to="/contact">Volunteer</Link>
        </div>

        <div className="footer-col">
          <h4>Resources</h4>
          <Link to="/news-blog">News &amp; blog</Link>
          <Link to="/photos">Photos</Link>
          <Link to="/e-news">E-News</Link>
          <Link to="/materials">Materials</Link>
        </div>

        <div className="footer-col">
          <h4>Contact</h4>
          {settings.org_email && <a href={`mailto:${settings.org_email}`}>{settings.org_email}</a>}
          {settings.org_phone && <a href={`tel:${settings.org_phone.replace(/[^\d+]/g, '')}`}>{settings.org_phone}</a>}
          {settings.facebook_url && (
            <a href={settings.facebook_url} target="_blank" rel="noreferrer" className="footer-fb">
              <FaFacebook aria-hidden="true" /> Facebook
            </a>
          )}
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner mono">
          <span>© {new Date().getFullYear()} {orgName}</span>
          <span>Organizing in Negros since 2013</span>
        </div>
      </div>
    </footer>
  );
}
