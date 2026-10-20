import { Link } from 'react-router-dom';
import { assetUrl } from '../api/axios';
import { decodeHtml, formatDate, postDate } from '../utils/format.js';
import './PostCard.css';

const TYPE_LABEL = { news: 'News', blog: 'Blog', event: 'Event' };

export default function PostCard({ post }) {
  const date = formatDate(postDate(post));
  return (
    <Link to={`/news-blog/${post.slug}`} className={`post-card post-card-${post.type}`}>
      <div className="post-card-image">
        {post.cover_image
          ? <img src={assetUrl(post.cover_image)} alt="" loading="lazy" />
          : <div className="post-card-placeholder" />}
        <span className="post-card-type mono">{TYPE_LABEL[post.type] || post.type}</span>
      </div>
      <div className="post-card-body">
        <span className="mono post-card-meta">
          {[post.category, date].filter(Boolean).join(' · ')}
        </span>
        <h3>{post.title}</h3>
        {post.short_description && <p>{decodeHtml(post.short_description)}</p>}
        {post.author && <span className="mono post-card-author">By {post.author}</span>}
      </div>
    </Link>
  );
}
