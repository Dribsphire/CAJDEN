import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHandsHelping, FaLock } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext.jsx';
import './AdminLogin.css';

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.username, form.password);
      if (data?.admin) {
        navigate('/admin', { replace: true });
      } else {
        setError('Login failed. Please try again....');
      } 
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-wrap">
      <form className="admin-login-card fade-in" onSubmit={handleSubmit}>
        <div className="admin-login-brand"><FaHandsHelping /> Admin Panel</div>
        <p className="admin-login-sub">Sign in to manage the NGO website content.</p>

        {error && <div className="admin-login-error">{error}</div>}

        <div className="form-row">
          <label htmlFor="username">Username</label>
          <input id="username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div className="form-row">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        </div>

        <button className="btn btn-primary admin-login-btn" disabled={loading}>
          <FaLock /> {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
