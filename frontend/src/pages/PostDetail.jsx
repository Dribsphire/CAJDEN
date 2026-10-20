import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaCalendarAlt, FaUserEdit, FaMapMarkerAlt, FaArrowLeft } from 'react-icons/fa';
import api, { assetUrl } from '../api/axios';
import { decodeHtml, formatDate } from '../utils/format.js';
import './PostDetail.css';

export default function PostDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    // posts.php looks up by id; we fetch the list filtered client-side by slug
    // (kept simple for this scaffold — swap for a dedicated ?slug= endpoint if preferred)
    api.get('/posts.php', { params: { limit: 24 } })
      .then(async res => {
        let found = (res.data.posts || []).find(p => p.slug === slug);
        if (!found) {
          // fall back: search across more pages/types
          const all = await Promise.all(['news', 'blog', 'event'].map(t => api.get('/posts.php', { params: { type: t, limit: 24 } })));
          for (const r of all) {
            const match = (r.data.posts || []).find(p => p.slug === slug);
            if (match) { found = match; break; }
          }
        }
        if (!found) { setError(true); return; }
        const full = await api.get('/posts.php', { params: { id: found.id } });
        setPost(full.data.post);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="container section"><div className="skeleton" style={{ height: 400 }} /></div>;
  }

  if (error || !post) {
    return (
      <div className="container section">
        <p className="empty-note">That story could not be found.</p>
        <p style={{ marginTop: 28 }}><Link to="/news-blog" className="btn"><FaArrowLeft aria-hidden="true" /> Back to News</Link></p>
      </div>
    );
  }

  const typeLabel = { news: 'News', blog: 'Blog', event: 'Event' }[post.type] || post.type;
  const paragraphs = decodeHtml(post.content).split('\n').map(p => p.trim()).filter(Boolean);

  return (
    <article className="post-detail">
      <header className="post-detail-head">
        <div className="container post-detail-head-inner">
          <Link to="/news-blog" className="mono post-detail-back"><FaArrowLeft aria-hidden="true" /> News, blog &amp; events</Link>
          <span className="label">{[typeLabel, post.category].filter(Boolean).join(' · ')}</span>
          <h1>{post.title}</h1>
          {post.short_description && <p className="post-detail-dek">{decodeHtml(post.short_description)}</p>}
          <div className="post-detail-meta mono">
            <span><FaCalendarAlt aria-hidden="true" /> {formatDate(post.published_at, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            {post.author && <span><FaUserEdit aria-hidden="true" /> {post.author}</span>}
            {post.type === 'event' && post.event_date && (
              <span><FaCalendarAlt aria-hidden="true" /> Event: {formatDate(post.event_date, { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
            )}
            {post.type === 'event' && post.event_venue && <span><FaMapMarkerAlt aria-hidden="true" /> {post.event_venue}</span>}
          </div>
        </div>
      </header>

      {post.cover_image && (
        <div className="container">
          <figure className="post-detail-cover">
            <img src={assetUrl(post.cover_image)} alt="" />
          </figure>
        </div>
      )}

      <div className="container">
        <div className="post-detail-content">
          {paragraphs.map((para, i) => <p key={i}>{para}</p>)}
        </div>
        <div className="post-detail-foot">
          <Link to="/news-blog" className="btn"><FaArrowLeft aria-hidden="true" /> More stories</Link>
        </div>
      </div>
    </article>
  );
}
