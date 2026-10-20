import { Link } from 'react-router-dom';
import Hablon from './Hablon.jsx';
import './PageHeader.css';

/**
 * Ink header used at the top of every inner page: breadcrumb, a big
 * poster-type title, a short lede, and a woven band along the bottom.
 * `crumbs` is a list of { label, to? }; the last item is the current page.
 */
export default function PageHeader({ title, lede, crumbs = [], size = 'xl' }) {
  return (
    <header className="page-header">
      <div className="container">
        {crumbs.length > 0 && (
          <nav className="page-header-crumbs mono" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={c.label}>
                {i > 0 && <span aria-hidden="true"> / </span>}
                {c.to ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <div className="page-header-row">
          <h1 className={`poster page-header-title page-header-title-${size}`}>{title}</h1>
          {lede && <p className="page-header-lede">{lede}</p>}
        </div>
        <Hablon variant="ink" height={16} />
      </div>
    </header>
  );
}
