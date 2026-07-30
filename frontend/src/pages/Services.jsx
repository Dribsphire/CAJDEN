import { useEffect, useState } from 'react';
import * as Icons from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import api, { assetUrl } from '../api/axios';
import './Services.css';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/services.php').then(res => setServices(res.data.services || [])).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">What We Do</span>
          <h1>Our Services</h1>
          <p>Programs designed to meet real needs across health, education, livelihood, and disaster response.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading && (
            <div className="services-full-grid">
              {[1, 2, 3, 4].map(i => <div className="skeleton" style={{ height: 340 }} key={i} />)}
            </div>
          )}

          {!loading && services.length === 0 && (
            <p>No services have been published yet. Please check back soon.</p>
          )}

          <div className="services-full-grid">
            {services.map(s => {
              const Icon = Icons[s.icon] || Icons.FaHandsHelping;
              return (
                <div className="service-full-card card fade-in" key={s.id}>
                  <div className="service-full-image">
                    {s.image_path ? (
                      <img src={assetUrl(s.image_path)} alt={s.title} loading="lazy" />
                    ) : (
                      <div className="service-full-placeholder"><Icon /></div>
                    )}
                    <div className="service-full-icon"><Icon /></div>
                  </div>
                  <div className="service-full-body">
                    <h3>{s.title}</h3>
                    <p>{s.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container cta-inner">
          <h2>Want to partner with us or request assistance?</h2>
          <p>Reach out and our team will connect you with the right program.</p>
          <Link to="/contact" className="btn btn-gold">Contact Us <FaArrowRight /></Link>
        </div>
      </section>
    </>
  );
}
