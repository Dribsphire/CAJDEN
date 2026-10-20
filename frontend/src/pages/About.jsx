import { useEffect, useState } from 'react';
import { FaHandshake, FaBalanceScale, FaHandsHelping, FaChild } from 'react-icons/fa';
import api from '../api/axios';
import { useSettings } from '../hooks/useSettings.js';
import Hierarchy from '../components/Hierarchy.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Hablon from '../components/Hablon.jsx';
import { decodeHtml } from '../utils/format.js';
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
      <PageHeader
        title="About"
        lede="From a small community initiative to an island-wide movement for empowerment."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'About' }]}
      />

      <section className="section">
        <div className="container about-history">
          <div className="about-history-side">
            <span className="label">Our history · Since 2013</span>
            <h2 className="about-history-title">Christian Advocates for Justice and Development in Negros</h2>
          </div>
          <div className="about-history-body">
            <p className="about-dropcap">
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

      <section className="about-mv">
        <div className="about-mv-block about-mv-mission">
          <span className="label">Mission</span>
          <p>{decodeHtml(settings.mission) || 'To empower Negrosanon communities through sustainable programs in education, health, and livelihood.'}</p>
        </div>
        <div className="about-mv-block about-mv-vision">
          <span className="label">Vision</span>
          <p>{decodeHtml(settings.vision) || 'A resilient and self-reliant Negros where every family thrives with dignity.'}</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-bar">
            <h2 className="poster">What guides us</h2>
          </div>
          <ol className="values-row">
            {CORE_VALUES.map((v, i) => (
              <li className="value-cell" key={v.title}>
                <span className="mono value-num">{String(i + 1).padStart(2, '0')}</span>
                <v.icon aria-hidden="true" className="value-icon" />
                <h3 className="poster">{v.title}</h3>
                <p>{v.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Hablon variant="green" height={24} />
      <section className="section about-leadership">
        <div className="container">
          <div className="section-bar">
            <div>
              <span className="label">Leadership</span>
              <h2 className="poster about-leadership-title">Officers &amp; staff</h2>
            </div>
            <p className="about-leadership-lede">The board, officers, and staff leading our programs, and the partner organizations we walk with.</p>
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
