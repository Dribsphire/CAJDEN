import { useEffect, useState } from 'react';
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaFacebook, FaPaperPlane } from 'react-icons/fa';
import api from '../api/axios';
import { useSettings } from '../hooks/useSettings.js';
import OfficeMap from '../components/OfficeMap.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Toast from '../components/Toast.jsx';
import './Contact.css';

const EMPTY_FORM = { full_name: '', email: '', subject: '', message: '' };

export default function Contact() {
  const { settings } = useSettings();
  const [offices, setOffices] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.get('/offices.php').then(res => setOffices(res.data.offices || []));
  }, []);

  function validate() {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Full name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.';
    if (!form.subject.trim()) e.subject = 'Subject is required.';
    if (!form.message.trim() || form.message.trim().length < 10) e.message = 'Message should be at least 10 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await api.post('/contact.php', form);
      setToast({ type: 'success', message: res.data.message });
      setForm(EMPTY_FORM);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Contact"
        lede="Have a question, want to volunteer, or need assistance? We'd love to hear from you."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Contact' }]}
      />

      <section className="section">
        <div className="container contact-grid">
          <div className="contact-info">
            <span className="label">Reach us directly</span>
            <ul className="contact-info-list">
              <li><FaMapMarkerAlt aria-hidden="true" /> <span>{settings.org_address || 'Bacolod City, Negros Occidental'}</span></li>
              {settings.org_phone && <li><FaPhone aria-hidden="true" /> <a href={`tel:${settings.org_phone.replace(/[^\d+]/g, '')}`}>{settings.org_phone}</a></li>}
              {settings.org_email && <li><FaEnvelope aria-hidden="true" /> <a href={`mailto:${settings.org_email}`}>{settings.org_email}</a></li>}
              {settings.facebook_url && <li><FaFacebook aria-hidden="true" /> <a href={settings.facebook_url} target="_blank" rel="noreferrer">Follow us on Facebook</a></li>}
            </ul>

            <form className="contact-form" onSubmit={handleSubmit} noValidate>
              <h2 className="poster">Send a message</h2>
              <div className="form-row">
                <label htmlFor="full_name">Full Name</label>
                <input
                  id="full_name" type="text" value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  aria-invalid={!!errors.full_name}
                />
                {errors.full_name && <span className="form-error">{errors.full_name}</span>}
              </div>

              <div className="form-row">
                <label htmlFor="email">Email</label>
                <input
                  id="email" type="email" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  aria-invalid={!!errors.email}
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              <div className="form-row">
                <label htmlFor="subject">Subject</label>
                <input
                  id="subject" type="text" value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  aria-invalid={!!errors.subject}
                />
                {errors.subject && <span className="form-error">{errors.subject}</span>}
              </div>

              <div className="form-row">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message" rows="5" value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  aria-invalid={!!errors.message}
                />
                {errors.message && <span className="form-error">{errors.message}</span>}
              </div>

              <button type="submit" className="btn btn-sun" disabled={submitting}>
                {submitting ? 'Sending…' : <>Send message <FaPaperPlane aria-hidden="true" /></>}
              </button>
            </form>
          </div>

          <div className="contact-map">
            <span className="label">Our offices &amp; FBPOs</span>
            <OfficeMap offices={offices} height={560} />
          </div>
        </div>
      </section>

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
