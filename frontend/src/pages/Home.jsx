import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaHandHoldingHeart, FaUsers, FaMapMarkedAlt } from 'react-icons/fa';
import * as Icons from 'react-icons/fa';
import api, { assetUrl } from '../api/axios';
import { useSettings } from '../hooks/useSettings.js';
import PostCard from '../components/PostCard.jsx';
import OfficeMap from '../components/OfficeMap.jsx';
import Carousel from '../components/Carousel.jsx';
import slide1 from '../assets/slider/slide1.jpg';
import slide2 from '../assets/slider/slide2.png';
import slide3 from '../assets/slider/slide3.png';
import GoalsSection from '../components/GoalsSection.jsx';
import './Home.css';

const HERO_SLIDES = [
  { src: slide1, alt: 'Community outreach program in Negros' },
  { src: slide2, alt: 'Volunteers distributing relief goods' },
  { src: slide3, alt: 'Children benefiting from foundation programs' },
];

export default function Home() {
  const { settings } = useSettings();
  const [services, setServices] = useState([]);
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/services.php'),
      api.get('/posts.php', { params: { limit: 3 } }),
      api.get('/posts.php', { params: { type: 'event', limit: 3 } }),
      api.get('/offices.php'),
    ]).then(([s, p, e, o]) => {
      setServices((s.data.services || []).slice(0, 3));
      setPosts(p.data.posts || []);
      setEvents(e.data.posts || []);
      setOffices(o.data.offices || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <Carousel images={HERO_SLIDES} interval={5000} />
        <div className="container hero-inner">
          <div className="hero-copy fade-in">
            <span className="eyebrow">Serving Negros Island Since 2013</span>
            <h1>{settings.org_name || 'CAJDEN Inc.'}</h1>
            <p className="hero-lead">
              {settings.mission || 'Empowering Negrosanon communities through sustainable programs in education, health, and livelihood — barangay by barangay, island-wide.'}
            </p>
            <div className="hero-actions">
              <Link to="/contact" className="btn btn-gold">Get Involved <FaArrowRight /></Link>
              <Link to="/about" className="btn btn-gold">Learn Our Story</Link>
            </div>
          </div>
          <div className="hero-stats fade-in">
            <div className="hero-stat-card">
              <FaUsers /> <div><strong>4,000+</strong><span>Lives reached</span></div>
            </div>
            <div className="hero-stat-card">
              <FaMapMarkedAlt /> <div><strong>{offices.length || 4}</strong><span>Office & FBPOs in Negros</span></div>
            </div>
            <div className="hero-stat-card">
              <FaHandHoldingHeart /> <div><strong>12 yrs</strong><span>Of community in service</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION / VISION PREVIEW */}
      <section className="section">
        <div className="container mv-grid">
          <div className="fade-in">
            <span className="eyebrow">Our Mission</span>
            <h2>{settings.mission || 'To empower Negrosanon communities through sustainable programs in education, health, and livelihood.'}</h2>
          </div>
          <div className="fade-in">
            <span className="eyebrow">Our Vision</span>
            <h2>{settings.vision || 'A resilient and self-reliant Negros where every family thrives with dignity.'}</h2>
          </div>
        </div>
      </section>

      <section>
        <GoalsSection />
      </section>

      {/* FEATURED SERVICES */}
      <section className="section section-sage">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">What We Do</span>
            <h2>Featured Services</h2>
            <p>Programs designed with — and for — the communities we serve.</p>
          </div>
          <div className="services-grid">
            {loading && [1, 2, 3].map(i => <div className="skeleton" style={{ height: 220 }} key={i} />)}
            {!loading && services.map(s => {
              const Icon = Icons[s.icon] || Icons.FaHandsHelping;
              return (
                <div className="service-preview-card card fade-in" key={s.id}>
                  <div className="service-preview-icon"><Icon /></div>
                  <h3>{s.title}</h3>
                  <p>{s.description}</p>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link to="/services" className="btn btn-primary">View All Services <FaArrowRight /></Link>
          </div>
        </div>
      </section>

      {/* LATEST NEWS */}
      <section className="section">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Stay Updated</span>
            <h2>Latest News</h2>
          </div>
          <div className="post-grid">
            {loading && [1, 2, 3].map(i => <div className="skeleton" style={{ height: 300 }} key={i} />)}
            {!loading && posts.map(p => <PostCard post={p} key={p.id} />)}
          </div>
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link to="/news-blog" className="btn btn-outline">Read More Stories <FaArrowRight /></Link>
          </div>
        </div>
      </section>

      {/* UPCOMING EVENTS */}
      {events.length > 0 && (
        <section className="section section-sage">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">Join Us</span>
              <h2>Upcoming Events</h2>
            </div>
            <div className="post-grid">
              {events.map(e => <PostCard post={e} key={e.id} />)}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="cta-section">
        <div className="container cta-inner fade-in">
          <h2>Every barangay counts. Every hand helps.</h2>
          <p>Whether through volunteering or partnership — your support keeps our programs running.</p>
          <Link to="/contact" className="btn btn-gold">Get in Touch <FaArrowRight /></Link>
        </div>
      </section>

      {/* MAP PREVIEW */}
      <section className="section">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Find Us</span>
            <h2>Office and FBPOs Across Negros</h2>
            <p>Visit our office and FBPOs partners around Negros Occidental </p>
          </div>
          <div className="contact-map fade-in">
            <OfficeMap offices={offices} height={420} />
          </div>
        </div>
      </section>
    </>
  );
}
