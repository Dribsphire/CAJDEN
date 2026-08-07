import { useEffect, useState } from 'react';
import { FaBullseye, FaEye, FaLeaf, FaHandshake, FaBalanceScale, FaHandsHelping, FaChild } from 'react-icons/fa';
import api from '../api/axios';
import { useSettings } from '../hooks/useSettings.js';
import Hierarchy from '../components/Hierarchy.jsx';
import './About.css';

const CORE_VALUES = [
  {
    icon: FaHandsHelping,
    title: 'Compassion',
    desc: 'Serving children, families, and communities with genuine care, respect, and empathy.'
  },
    {
    icon: FaChild,
    title: 'Child Protection',
    desc: 'Upholding the rights, dignity, safety, and well-being of every child.'
  },
    {
    icon: FaBalanceScale,
    title: 'Social Justice',
    desc: 'Promoting equality, human dignity, and opportunities for marginalized communities.'
  },
    {
    icon: FaHandshake,
    title: 'Partnership',
    desc: 'Building strong collaborations with parishes, communities, volunteers, and partner organizations.'
  },
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
              {settings.org_name || 'CAJDEN Inc.'} is a faith-based, non-government organization based in Bacolod City, Negros Occidental. Guided by Christian values and a commitment to social justice, 
              the organization works alongside communities to protect the rights and dignity of children while promoting sustainable and inclusive development.
            </p>
            <p>
              Since its establishment, CAJDEN has dedicated its efforts to addressing child labor, preventing child abuse and exploitation, 
              and empowering vulnerable children and their families. Recognizing that lasting change begins within the community, the organization 
              partners with local leaders, parishes, volunteers, and other institutions throughout Negros Occidental to create programs that respond 
              to the needs of the people it serves.
            </p>
            <p>
              Over the years, CAJDEN has expanded its initiatives beyond child protection by implementing livelihood and community development 
              programs that help families build stable and sustainable sources of income. Through education, advocacy, capacity-building, and strong 
              community partnerships, the organization continues to strengthen its mission of creating safer environments where children can grow, learn, and thrive.
            </p>
            <p>
              Today, CAJDEN remains committed to building compassionate and empowered communities by upholding children's rights, promoting 
              social justice, and working hand in hand with churches, partner organizations, and communities across Negros Occidental to create 
              lasting positive change.
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
