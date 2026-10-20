import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import api, { assetUrl } from '../api/axios';
import { useSettings } from '../hooks/useSettings.js';
import { decodeHtml, formatMonthYear, postDate } from '../utils/format.js';
import { plainText } from '../utils/postContent.js';
import OfficeMap from '../components/OfficeMap.jsx';
import GoalsSection from '../components/GoalsSection.jsx';
import Hablon from '../components/Hablon.jsx';
import heroPhoto from '../assets/hero/youth-assembly.jpg';
import './Home.css';

const STORY_TINTS = ['tint-sky', 'tint-sun', 'tint-white'];
const TYPE_LABEL = { news: 'News', blog: 'Blog', event: 'Event' };

function storyMeta(post) {
  return [TYPE_LABEL[post.type] || post.type, formatMonthYear(postDate(post))].filter(Boolean).join(' · ');
}

export default function Home() {
  const { settings } = useSettings();
  const [services, setServices] = useState([]);
  const [posts, setPosts] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/services.php'),
      api.get('/posts.php', { params: { limit: 4 } }),
      api.get('/offices.php'),
    ]).then(([s, p, o]) => {
      if (s.status === 'fulfilled') setServices((s.value.data.services || []).slice(0, 4));
      if (p.status === 'fulfilled') setPosts(p.value.data.posts || []);
      if (o.status === 'fulfilled') setOffices(o.value.data.offices || []);
    }).finally(() => setLoading(false));
  }, []);

  const [featured, ...others] = posts;

  return (
    <>
      {/* HERO */}
      <section className="home-hero">
        <div className="home-hero-copy on-dark">
          <span className="mono home-hero-kicker">Bacolod City · Negros Occidental · Since 2013</span>
          <h1 className="home-hero-title">
            <span className="poster">Lasting change<br />begins in the</span>
            <span className="poster home-hero-mark">Community.</span>
          </h1>
          <div className="home-hero-foot">
            <p>
              We organize faith-based people's organizations to protect children, strengthen
              families, and build livelihoods that last.
            </p>
            <div className="home-hero-actions">
              <Link to="/services" className="btn btn-sun">See our programs <FaArrowRight aria-hidden="true" /></Link>
              <Link to="/about" className="btn btn-ghost-light">Our story</Link>
            </div>
          </div>
        </div>
        <figure className="home-hero-photo">
          <img src={heroPhoto} alt="Young leaders in pink shirts at a CAJDEN youth assembly, gathered outdoors under the trees" />
          <span className="home-hero-sticker poster" aria-hidden="true">12 years<br />on the<br />ground</span>
          <figcaption className="mono">Youth assembly</figcaption>
        </figure>
      </section>

      {/* STATS */}
      <section className="home-stats" aria-label="CAJDEN in numbers">
        <div><strong className="poster">4,000+</strong><span className="mono">Lives reached</span></div>
        <div><strong className="poster">{offices.length || 4}</strong><span className="mono">Offices &amp; FBPOs in Negros</span></div>
        <div><strong className="poster">8</strong><span className="mono">Founding commitments</span></div>
        <div className="home-stats-accent"><strong className="poster">2013</strong><span className="mono">Year founded</span></div>
      </section>

      {/* MISSION / VISION */}
      <section className="section home-mission">
        <div className="container home-mission-grid">
          <div className="home-mission-tag">
            <span className="label">Our mission</span>
          </div>
          <p className="home-mission-text">
            {decodeHtml(settings.mission) || 'To empower Negrosanon communities through sustainable programs in education, health, and livelihood.'}
          </p>
          <div className="home-mission-tag">
            <span className="label">Our vision</span>
          </div>
          <p className="home-vision-text">
            {decodeHtml(settings.vision) || 'A resilient and self-reliant Negros where every family thrives with dignity.'}
          </p>
        </div>
      </section>

      {/* PROGRAMS */}
      <Hablon variant="green" height={24} />
      <section className="home-programs on-dark">
        <div className="container">
          <div className="section-bar">
            <h2 className="poster">What we do</h2>
            <Link to="/services" className="btn btn-sun">All programs <FaArrowRight aria-hidden="true" /></Link>
          </div>
          {loading && [1, 2, 3].map(i => <div className="skeleton home-program-skeleton" key={i} />)}
          {!loading && services.length === 0 && (
            <p className="home-programs-empty">Program details are on their way.</p>
          )}
          <ol className="home-program-list">
            {services.map((s, i) => (
              <li className="home-program" key={s.id}>
                <span className="mono home-program-num">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="poster"><Link to={`/services#program-${s.id}`}>{decodeHtml(s.title)}</Link></h3>
                <p>{decodeHtml(s.summary) || plainText(s.description)}</p>
                {s.image_path && <img src={assetUrl(s.image_path)} alt="" loading="lazy" />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <GoalsSection />

      {/* STORIES */}
      <section className="section home-stories">
        <div className="container">
          <div className="section-bar">
            <h2 className="poster">From the <span className="home-red">field</span></h2>
            <Link to="/news-blog" className="btn">All stories <FaArrowRight aria-hidden="true" /></Link>
          </div>

          {loading && <div className="skeleton" style={{ height: 420 }} />}
          {!loading && !featured && <p className="empty-note">Stories from our communities will appear here soon.</p>}

          {featured && (
            <div className="home-stories-grid">
              <Link to={`/news-blog/${featured.slug}`} className="story-feature">
                {featured.cover_image
                  ? <img src={assetUrl(featured.cover_image)} alt="" loading="lazy" />
                  : <div className="story-placeholder" />}
                <div className="story-feature-body">
                  <span className="label">{storyMeta(featured)}</span>
                  <h3>{featured.title}</h3>
                  {featured.short_description && <p>{decodeHtml(featured.short_description)}</p>}
                </div>
              </Link>
              <div className="story-list">
                {others.map((p, i) => (
                  <Link to={`/news-blog/${p.slug}`} className={`story-row ${STORY_TINTS[i % STORY_TINTS.length]}`} key={p.id}>
                    {p.cover_image
                      ? <img src={assetUrl(p.cover_image)} alt="" loading="lazy" />
                      : <div className="story-placeholder" />}
                    <div className="story-row-body">
                      <span className="mono">{storyMeta(p)}</span>
                      <h3>{p.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="home-cta">
        <div className="container home-cta-inner">
          <div className="home-cta-copy">
            <h2 className="poster">Magbulig kita.</h2>
            <p className="serif">Let's help each other. Volunteer, partner, or support a program.</p>
          </div>
          <div className="home-cta-actions">
            <Link to="/contact" className="btn btn-primary" style={{ boxShadow: '6px 6px 0 var(--orange)' }}>Volunteer <FaArrowRight aria-hidden="true" /></Link>
            <Link to="/contact" className="btn">Partner with us <FaArrowRight aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      {/* MAP */}
      <section className="section">
        <div className="container">
          <div className="section-bar">
            <div>
              <span className="label">Find us</span>
              <h2 className="poster home-map-title">Offices &amp; FBPOs across Negros</h2>
            </div>
            <Link to="/contact" className="btn">Contact us <FaArrowRight aria-hidden="true" /></Link>
          </div>
          <OfficeMap offices={offices} height={440} />
        </div>
      </section>
    </>
  );
}
