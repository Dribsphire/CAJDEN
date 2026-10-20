import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaCalendarAlt, FaUserEdit, FaMapMarkerAlt, FaArrowLeft } from 'react-icons/fa';
import api, { assetUrl } from '../api/axios';
import { decodeHtml, formatDate } from '../utils/format.js';
import { renderPostHtml } from '../utils/postContent.js';
import './PostDetail.css';

export default function PostDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    // Drafts and scheduled posts are only returned to a logged-in admin.
    api.get('/posts.php', { params: { slug } })
      .then(res => setPost(res.data.post))
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

  return (
    <article className="post-detail">
      {!post.is_public && (
        <div className="post-preview-banner mono" role="status">
          {post.status === 'draft'
            ? 'Draft preview: only admins can see this page.'
            : `Scheduled: goes live on ${formatDate(post.published_at, { month: 'long', day: 'numeric', year: 'numeric' })}. Only admins can see it until then.`}
        </div>
      )}
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
        {/* renderPostHtml sanitizes with DOMPurify before injecting */}
        <div className="post-detail-content prose" dangerouslySetInnerHTML={{ __html: renderPostHtml(post.content) }} />
        <div className="post-detail-foot">
          <Link to="/news-blog" className="btn"><FaArrowLeft aria-hidden="true" /> More stories</Link>
        </div>
      </div>
    </article>
  );
}
