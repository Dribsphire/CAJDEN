import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import api, { assetUrl } from '../api/axios';
import PageHeader from '../components/PageHeader.jsx';
import { decodeHtml } from '../utils/format.js';
import './Services.css';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/services.php')
      .then(res => setServices(res.data.services || []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Programs"
        lede="Programs built with, and for, the communities we serve: children, youth, families, and parishes across Negros."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Programs' }]}
      />

      <section className="section">
        <div className="container">
          {loading && <div className="skeleton" style={{ height: 420 }} />}
          {!loading && services.length === 0 && (
            <p className="empty-note">Program details are being written up. Please check back soon.</p>
          )}

          <div className="program-list">
            {services.map((s, i) => (
              <article className={`program-row ${i % 2 ? 'program-row-flip' : ''}`} key={s.id}>
                <div className="program-image">
                  {s.image_path
                    ? <img src={assetUrl(s.image_path)} alt="" loading="lazy" />
                    : <div className="program-image-empty" />}
                </div>
                <div className="program-body">
                  <span className="mono program-num">Program {String(i + 1).padStart(2, '0')}</span>
                  <h2 className="poster">{decodeHtml(s.title)}</h2>
                  <p>{decodeHtml(s.description)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="program-cta on-dark">
        <div className="container program-cta-inner">
          <h2 className="poster">Partner with us or request assistance.</h2>
          <div>
            <p>Reach out and our team will connect you with the right program.</p>
            <Link to="/contact" className="btn btn-sun">Contact us <FaArrowRight aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
