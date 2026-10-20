import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaArrowLeft, FaChevronLeft, FaChevronRight, FaTimes } from 'react-icons/fa';
import api, { assetUrl } from '../api/axios';
import PageHeader from '../components/PageHeader.jsx';
import { decodeHtml, formatDate } from '../utils/format.js';
import './Photos.css';

function Lightbox({ photos, index, onClose, onMove }) {
  const photo = photos[index];

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onMove(1);
      if (e.key === 'ArrowLeft') onMove(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose, onMove]);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={onClose}>
      <button className="lightbox-btn lightbox-close" onClick={onClose} aria-label="Close"><FaTimes /></button>
      {photos.length > 1 && (
        <button className="lightbox-btn lightbox-prev" onClick={e => { e.stopPropagation(); onMove(-1); }} aria-label="Previous photo"><FaChevronLeft /></button>
      )}
      <figure className="lightbox-figure" onClick={e => e.stopPropagation()}>
        <img src={assetUrl(photo.image_path)} alt={photo.caption || ''} />
        <figcaption className="mono">
          <span>{index + 1} / {photos.length}</span>
          {photo.caption && <span>{photo.caption}</span>}
        </figcaption>
      </figure>
      {photos.length > 1 && (
        <button className="lightbox-btn lightbox-next" onClick={e => { e.stopPropagation(); onMove(1); }} aria-label="Next photo"><FaChevronRight /></button>
      )}
    </div>
  );
}

export default function AlbumDetail() {
  const { id } = useParams();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get('/albums.php', { params: { id } })
      .then(res => setAlbum(res.data.album))
      .catch(() => setAlbum(null))
      .finally(() => setLoading(false));
  }, [id]);

  const photos = album?.photos || [];
  const close = useCallback(() => setActive(null), []);
  const move = useCallback(step => setActive(i => (i + step + photos.length) % photos.length), [photos.length]);

  if (loading) {
    return <div className="container section"><div className="skeleton" style={{ height: 480 }} /></div>;
  }

  if (!album) {
    return (
      <div className="container section">
        <p className="empty-note">That album could not be found.</p>
        <p style={{ marginTop: 28 }}><Link to="/photos" className="btn"><FaArrowLeft aria-hidden="true" /> All albums</Link></p>
      </div>
    );
  }

  return (
    <>
      {!Number(album.is_published) && (
        <div className="post-preview-banner mono" role="status">Hidden album: only admins can see this page.</div>
      )}
      <PageHeader
        title={album.title}
        size="md"
        crumbs={[{ label: 'Resources' }, { label: 'Photos', to: '/photos' }, { label: album.title }]}
      />
      <section className="section album-detail">
        <div className="container">
          <div className="album-detail-meta">
            <div className="album-detail-facts mono">
              {album.category && <span>{album.category}</span>}
              {(album.event_date || album.created_at) && <span>{formatDate(album.event_date || album.created_at, { month: 'long', day: 'numeric', year: 'numeric' })}</span>}
              <span>{photos.length} photo{photos.length === 1 ? '' : 's'}</span>
            </div>
            {album.description && <p className="album-detail-desc">{decodeHtml(album.description)}</p>}
            <Link to="/photos" className="btn btn-sm"><FaArrowLeft aria-hidden="true" /> All albums</Link>
          </div>

          {photos.length === 0 && <p className="empty-note">Photos for this album are being uploaded.</p>}

          <div className="photo-masonry">
            {photos.map((p, i) => (
              <button key={p.id} className="photo-tile" onClick={() => setActive(i)} aria-label={`Open photo ${i + 1}${p.caption ? `: ${p.caption}` : ''}`}>
                <img src={assetUrl(p.image_path)} alt={p.caption || ''} loading="lazy" />
                {p.caption && <span className="photo-tile-caption">{p.caption}</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      {active !== null && photos[active] && (
        <Lightbox photos={photos} index={active} onClose={close} onMove={move} />
      )}
    </>
  );
}
