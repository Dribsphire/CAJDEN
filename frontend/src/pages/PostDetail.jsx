import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaCalendarAlt, FaUserEdit, FaMapMarkerAlt, FaArrowLeft } from 'react-icons/fa';
import api, { assetUrl } from '../api/axios';
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
    return <div className="container" style={{ padding: '80px 24px' }}><div className="skeleton" style={{ height: 400 }} /></div>;
  }

  if (error || !post) {
    return (
      <div className="container" style={{ padding: '100px 24px', textAlign: 'center' }}>
        <h2>Post not found</h2>
        <Link to="/news-blog" className="btn btn-primary" style={{ marginTop: 20 }}>Back to News &amp; Blog</Link>
      </div>
    );
  }

  const date = new Date(post.published_at || post.event_date);

  return (
    <article className="post-detail">
      <div className="post-detail-cover">
        {post.cover_image ? <img src={assetUrl(post.cover_image)} alt={post.title} /> : <div className="post-detail-placeholder" />}
      </div>
      <div className="container post-detail-body"><br />
          <Link to="/news-blog" className="post-detail-back"><FaArrowLeft /> Back to News &amp; Blog</Link>
          <span className="badge" style={{ marginLeft: 12 }}>{post.type}</span>

        <h1>{post.title}</h1>
        <div className="post-detail-meta">
          <span><FaCalendarAlt /> {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          {post.author && <span><FaUserEdit /> {post.author}</span>}
          {post.type === 'event' && post.event_venue && <span><FaMapMarkerAlt /> {post.event_venue}</span>}
        </div>
        <div className="post-detail-content">
          {post.content.split('\n').map((para, i) => para.trim() && <p key={i}>{para}</p>)}
        </div>
      </div>
    </article>
  );
}
