import { useEffect, useState } from 'react';
import { FaBullseye, FaEye, FaLeaf, FaHandshake, FaBalanceScale } from 'react-icons/fa';
import api from '../api/axios';
import { useSettings } from '../hooks/useSettings.js';
import Hierarchy from '../components/Hierarchy.jsx';
import './About.css';

const CORE_VALUES = [
  { icon: FaHandshake, title: 'Bayanihan Spirit', desc: 'Community-driven action rooted in mutual aid.' },
  { icon: FaBalanceScale, title: 'Integrity', desc: 'Transparent and accountable in every program.' },
  { icon: FaLeaf, title: 'Sustainability', desc: 'Solutions built to last beyond a single project.' },
  { icon: FaHandshake, title: 'Inclusivity', desc: 'Every barangay, every family, matters equally.' },
];

export default function About() {
  const { settings } = useSettings();
  const [officers, setOfficers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/officers.php'), api.get('/partners.php')])
      .then(([o, p]) => {
        setOfficers(o.data.officers || []);
        setPartners(p.data.partners || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">About Us</span>
          <h1>Our Story, Rooted in Negros</h1>
          <p>From a small barangay initiative to an island-wide movement for community empowerment.</p>
        </div>
      </section>

      <section className="section">
        <div className="container about-history">
          <div>
            <span className="eyebrow">Our History</span>
            <h2>Christian Advocates for Justice and Development in Negros 2013</h2>
            <p>
              {settings.org_name || 'Negros Bayanihan Foundation'} began as a volunteer relief effort after a series of
              typhoons left many Negrosanon families without access to basic services. What started as a handful of
              neighbors pooling resources grew into a registered non-profit organization now serving communities across
              both Negros Occidental and Negros Oriental.
            </p>
            <p>
              Today, the foundation runs year-round programs in health, education, livelihood, and disaster response —
              guided by the same bayanihan spirit that inspired its founding.
            </p>
          </div>
        </div>
      </section>

      <section className="section section-sage">
        <div className="container mv-cards">
          <div className="card mv-card fade-in">
            <FaBullseye />
            <h3>Mission</h3>
            <p>{settings.mission || 'To empower Negrosanon communities through sustainable programs in education, health, and livelihood.'}</p>
          </div>
          <div className="card mv-card fade-in">
            <FaEye />
            <h3>Vision</h3>
            <p>{settings.vision || 'A resilient and self-reliant Negros where every family thrives with dignity.'}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">What Guides Us</span>
            <h2>Core Values</h2>
          </div>
          <div className="values-grid">
            {CORE_VALUES.map(v => (
              <div className="value-card card fade-in" key={v.title}>
                <v.icon />
                <h4>{v.title}</h4>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-sage">
        <div className="container">
          <div className="section-heading" style={{ margin: '0 auto 44px', textAlign: 'center' }}>
            <span className="eyebrow">Leadership</span>
            <h2>Organization Officers</h2>
            <p>Meet the officers, board members, and staff leading our programs.</p>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 300 }} />
          ) : (
            <Hierarchy officers={officers} partners={partners} />
          )}
        </div>
      </section>
    </>
  );
}
