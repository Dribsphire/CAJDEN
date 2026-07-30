import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const STAT_LABELS = [
  ['total_news', 'Total News'],
  ['total_blogs', 'Total Blogs'],
  ['total_events', 'Total Events'],
  ['total_services', 'Total Services'],
  ['total_offices', 'Total Offices'],
  ['total_officers', 'Total Officers'],
  ['total_messages', 'Total Messages'],
  ['unread_messages', 'Unread Messages'],
];

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard.php').then(res => setData(res.data));
  }, []);

  return (
    <>
      <div className="admin-page-header"><h2>Dashboard Overview</h2></div>

      <div className="stat-grid">
        {STAT_LABELS.map(([key, label]) => (
          <div className="stat-card" key={key}>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{data ? data.counts[key] : '—'}</div>
          </div>
        ))}
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th colSpan={2}>Recent Messages</th></tr></thead>
            <tbody>
              {data?.recent_messages?.map(m => (
                <tr key={m.id}>
                  <td>{m.full_name} — {m.subject}</td>
                  <td>{new Date(m.sent_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {data && data.recent_messages.length === 0 && <tr><td colSpan={2}>No messages yet.</td></tr>}
            </tbody>
          </table>
          <div style={{ padding: 14 }}><Link to="/admin/messages">View all messages →</Link></div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th colSpan={2}>Recent Posts</th></tr></thead>
            <tbody>
              {data?.recent_posts?.map(p => (
                <tr key={p.id}>
                  <td>[{p.type}] {p.title}</td>
                  <td>{new Date(p.published_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {data && data.recent_posts.length === 0 && <tr><td colSpan={2}>No posts yet.</td></tr>}
            </tbody>
          </table>
          <div style={{ padding: 14 }}><Link to="/admin/posts">Manage posts →</Link></div>
        </div>
      </div>
    </>
  );
}
