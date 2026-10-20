import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import Hablon from '../components/Hablon.jsx';

export default function NotFound() {
  return (
    <section className="section">
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <span className="label">Error 404</span>
        <h1 className="poster" style={{ fontSize: 'clamp(4.5rem, 20vw, 16rem)' }}>Lost?</h1>
        <p className="serif" style={{ fontSize: '1.6rem', fontStyle: 'italic', color: 'var(--ink)', maxWidth: 640, margin: 0 }}>
          This page doesn't exist, or it moved when the site was rebuilt.
        </p>
        <Hablon height={14} />
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-sun">Back to home <FaArrowRight aria-hidden="true" /></Link>
          <Link to="/news-blog" className="btn">Read the news</Link>
        </div>
      </div>
    </section>
  );
}
