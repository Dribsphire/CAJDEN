import { Link } from 'react-router-dom';
import { FaCalendarAlt, FaUserEdit } from 'react-icons/fa';
import { assetUrl } from '../api/axios';
import './PostCard.css';

export default function PostCard({ post }) {
  const date = new Date(post.published_at || post.event_date || Date.now());
  return (
    <Link to={`/news-blog/${post.slug}`} className="post-card card fade-in">
      <div className="post-card-image">
        {post.cover_image ? (
          <img src={assetUrl(post.cover_image)} alt={post.title} loading="lazy" />
        ) : (
          <div className="post-card-placeholder" />
        )}
        <span className="badge post-card-type">{post.type}</span>
      </div>
      <div className="post-card-body">
        {post.category && <span className="post-card-category">{post.category}</span>}
        <h3>{post.title}</h3>
        {post.short_description && <p>{post.short_description}</p>}
        <div className="post-card-meta">
          <span><FaCalendarAlt /> {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          {post.author && <span><FaUserEdit /> {post.author}</span>}
        </div>
      </div>
    </Link>
  );
}
