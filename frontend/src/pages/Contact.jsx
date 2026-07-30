import { useEffect, useState } from 'react';
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaFacebook, FaPaperPlane } from 'react-icons/fa';
import api from '../api/axios';
import { useSettings } from '../hooks/useSettings.js';
import OfficeMap from '../components/OfficeMap.jsx';
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
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Get in Touch</span>
          <h1>Contact Us</h1>
          <p>Have a question, want to volunteer, or need assistance? We'd love to hear from you.</p>
        </div>
      </section>

      <section className="section">
        <div className="container contact-grid">
          <div className="contact-info fade-in">
            <h3>Reach Us Directly</h3>
            <ul className="contact-info-list">
              <li><FaMapMarkerAlt /> <span>{settings.org_address || 'Rizal St., Bacolod City, Negros Occidental'}</span></li>
              <li><FaPhone /> <span>{settings.org_phone || '+63 34 123 4567'}</span></li>
              <li><FaEnvelope /> <span>{settings.org_email || 'contact@negrosbayanihan.org'}</span></li>
              {settings.facebook_url && <li><FaFacebook /> <a href={settings.facebook_url} target="_blank" rel="noreferrer">Follow us on Facebook</a></li>}
            </ul>

            <form className="contact-form" onSubmit={handleSubmit} noValidate>
              <h3>Send a Message</h3>
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

              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Sending…' : <>Send Message <FaPaperPlane /></>}
              </button>
            </form>
          </div>

          <div className="contact-map fade-in">
            <h3>Our Office and FBPOs</h3>
            <OfficeMap offices={offices} height={560} />
          </div>
        </div>
      </section>

      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
