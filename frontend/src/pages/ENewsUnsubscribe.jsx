import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import api from '../api/axios';
import PageHeader from '../components/PageHeader.jsx';

/**
 * /e-news/unsubscribe?token=… (linked from the welcome email).
 * Asks for a click first, so link scanners in mail apps can't unsubscribe people by accident.
 */
export default function ENewsUnsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState('idle'); // idle | working | done | error
  const [message, setMessage] = useState('');

  async function unsubscribe() {
    setState('working');
    try {
      const res = await api.post('/enews_subscribe.php?action=unsubscribe', { token });
      setMessage(res.data.message);
      setState('done');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Something went wrong. Please try again.');
      setState('error');
    }
  }

  return (
    <>
      <PageHeader title="Unsubscribe" size="md" crumbs={[{ label: 'E-News', to: '/e-news' }, { label: 'Unsubscribe' }]} />
      <section className="section">
        <div className="container" style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start' }}>
          {!token && <p className="empty-note">This unsubscribe link is incomplete. Use the link in your welcome email, or reply to any issue with "unsubscribe".</p>}
          {token && state !== 'done' && (
            <>
              <p className="serif" style={{ fontSize: '1.4rem', color: 'var(--ink)', margin: 0 }}>
                Stop receiving CAJDEN E-News by email?
              </p>
              <p style={{ margin: 0 }}>You can subscribe again any time from the E-News page.</p>
              <button type="button" className="btn btn-sun" onClick={unsubscribe} disabled={state === 'working'}>
                {state === 'working' ? 'Unsubscribing…' : 'Yes, unsubscribe me'}
              </button>
              {state === 'error' && <p role="alert" style={{ color: 'var(--red)', margin: 0 }}>{message}</p>}
            </>
          )}
          {state === 'done' && (
            <>
              <p className="serif" style={{ fontSize: '1.4rem', color: 'var(--ink)', margin: 0 }} role="status">{message}</p>
              <Link to="/e-news" className="btn">Back to E-News <FaArrowRight aria-hidden="true" /></Link>
            </>
          )}
        </div>
      </section>
    </>
  );
}
