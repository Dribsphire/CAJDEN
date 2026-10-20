import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import api, { assetUrl } from '../api/axios';
import PageHeader from '../components/PageHeader.jsx';
import { decodeHtml, formatMonthYear } from '../utils/format.js';
import './Photos.css';

function AlbumCard({ album }) {
  return (
    <Link to={`/photos/${album.id}`} className="album-card">
      <div className="album-card-image">
        {album.cover_path
          ? <img src={assetUrl(album.cover_path)} alt="" loading="lazy" />
          : <div className="album-card-empty" />}
        <span className="mono album-card-count">{album.photo_count} photo{Number(album.photo_count) === 1 ? '' : 's'}</span>
      </div>
      <span className="mono album-card-meta">
        {[album.category, formatMonthYear(album.event_date || album.created_at)].filter(Boolean).join(' · ')}
      </span>
      <h3>{album.title}</h3>
    </Link>
  );
}

export default function Photos() {
  const [albums, setAlbums] = useState([]);
  const [categories, setCategories] = useState([]);
  const [years, setYears] = useState([]);
  const [category, setCategory] = useState('');
  const [year, setYear] = useState('');
  const [featured, setFeatured] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/albums.php', { params: { category: category || undefined, year: year || undefined } })
      .then(res => {
        setAlbums(res.data.albums || []);
        setCategories(res.data.categories || []);
        setYears(res.data.years || []);
      })
      .catch(() => setAlbums([]))
      .finally(() => setLoading(false));
  }, [category, year]);

  // The featured album is only shown on the unfiltered view.
  const filtered = Boolean(category || year);
  const featuredSummary = !filtered ? (albums.find(a => Number(a.is_featured)) || albums[0]) : null;

  useEffect(() => {
    if (!featuredSummary) { setFeatured(null); return; }
    api.get('/albums.php', { params: { id: featuredSummary.id } })
      .then(res => setFeatured(res.data.album))
      .catch(() => setFeatured(null));
  }, [featuredSummary?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const rest = featuredSummary ? albums.filter(a => a.id !== featuredSummary.id) : albums;
  const totalPhotos = albums.reduce((sum, a) => sum + Number(a.photo_count || 0), 0);
  const extraThumbs = featured?.photos?.slice(1, 3) || [];
  const remaining = featured ? Math.max(0, Number(featured.photo_count) - 1 - extraThumbs.length) : 0;

  return (
    <>
      <PageHeader
        title="Photos"
        lede="Albums from our programs, assemblies, and field visits across Negros Occidental."
        crumbs={[{ label: 'Resources' }, { label: 'Photos' }]}
      />

      {(categories.length > 0 || years.length > 1) && (
        <div className="photos-filters">
          <div className="container photos-filters-inner">
            <div className="chips" role="group" aria-label="Filter by program">
              <button className={`chip ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>All albums</button>
              {categories.map(c => (
                <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
              ))}
            </div>
            {years.length > 1 && (
              <div className="chips" role="group" aria-label="Filter by year">
                <button className={`chip ${!year ? 'active' : ''}`} onClick={() => setYear('')}>All years</button>
                {years.map(y => (
                  <button key={y} className={`chip ${String(year) === String(y) ? 'active' : ''}`} onClick={() => setYear(y)}>{y}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <section className="section photos-body">
        <div className="container">
          {loading && <div className="skeleton" style={{ height: 480 }} />}

          {!loading && albums.length === 0 && (
            <p className="empty-note">
              {filtered ? 'No albums match that filter yet.' : 'Photo albums from our programs will be posted here soon.'}
            </p>
          )}

          {!loading && featuredSummary && (
            <article className="photos-featured">
              <Link to={`/photos/${featuredSummary.id}`} className="photos-featured-cover">
                {featuredSummary.cover_path
                  ? <img src={assetUrl(featuredSummary.cover_path)} alt="" />
                  : <div className="album-card-empty" />}
                <span className="mono photos-featured-tag">Featured album</span>
              </Link>
              <div className="photos-featured-info">
                <div className="photos-featured-text">
                  <span className="label">
                    {[featuredSummary.category, formatMonthYear(featuredSummary.event_date || featuredSummary.created_at)].filter(Boolean).join(' · ')}
                  </span>
                  <h2 className="poster">{featuredSummary.title}</h2>
                  {featuredSummary.description && <p>{decodeHtml(featuredSummary.description)}</p>}
                </div>
                <div className="photos-featured-foot">
                  {extraThumbs.length > 0 && (
                    <div className="photos-featured-thumbs">
                      {extraThumbs.map(p => <img key={p.id} src={assetUrl(p.image_path)} alt="" loading="lazy" />)}
                      {remaining > 0 && <span className="poster">+{remaining}</span>}
                    </div>
                  )}
                  <Link to={`/photos/${featuredSummary.id}`} className="btn btn-sun">Open album <FaArrowRight aria-hidden="true" /></Link>
                </div>
              </div>
            </article>
          )}

          {!loading && rest.length > 0 && (
            <>
              <div className="grid-head">
                <h2 className="poster">{filtered ? 'Albums' : 'All albums'}</h2>
                <span className="mono">{albums.length} album{albums.length === 1 ? '' : 's'} · {totalPhotos} photos</span>
              </div>
              <div className="album-grid">
                {rest.map(a => <AlbumCard album={a} key={a.id} />)}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
