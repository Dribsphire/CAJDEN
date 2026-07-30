import { Link } from 'react-router-dom';
import { FaFacebook, FaEnvelope, FaPhone, FaMapMarkerAlt, FaHandsHelping } from 'react-icons/fa';
import { useSettings } from '../hooks/useSettings.js';
import './Footer.css';

export default function Footer() {
  const { settings } = useSettings();

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-brand"><FaHandsHelping /> {settings.org_name || 'CAJDEN Inc.'}</div>
          <p className="footer-tagline">{settings.mission || 'Empowering Negrosanon communities through education, health, and livelihood programs.'}</p>
          {settings.facebook_url && (
            <a href={settings.facebook_url} target="_blank" rel="noreferrer" className="footer-social" aria-label="Facebook">
              <FaFacebook />
            </a>
          )}
        </div>

        <div>
          <h4 className="footer-heading">Quick Links</h4>
          <ul className="footer-list">
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/services">Our Services</Link></li>
            <li><Link to="/news-blog">News & Blog</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="footer-heading">Contact</h4>
          <ul className="footer-list footer-contact">
            <li><FaMapMarkerAlt /> {settings.org_address || 'Bacolod City, Negros Occidental'}</li>
            <li><FaPhone /> {settings.org_phone || '+63 34 123 4567'}</li>
            <li><FaEnvelope /> {settings.org_email || 'info@cajden.org'}</li>
          </ul>
        </div>
      </div><br></br>

      <div className="footer-bottom">
        <div className="container">
          © {new Date().getFullYear()} {settings.org_name || 'CAJDEN Inc.'}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
