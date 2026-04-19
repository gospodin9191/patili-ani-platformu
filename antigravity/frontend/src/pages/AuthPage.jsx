import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        const r = await api.post('/auth/register', {
          username: form.username,
          email: form.email,
          password: form.password,
        });
        login(r.data.token, r.data.user);
      } else {
        const r = await api.post('/auth/login', {
          email: form.email,
          password: form.password,
        });
        login(r.data.token, r.data.user);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🐾</span>
          <div className="auth-logo-title">Patili Anılar</div>
          <div className="auth-logo-subtitle">Onların anısı burada yaşamaya devam eder 🕯️</div>
        </div>

        <form className="auth-form" onSubmit={submit} id="auth-form">
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label" htmlFor="username">Kullanıcı Adı</label>
              <input
                id="username"
                className="form-input"
                type="text"
                placeholder="örn: kediseveri"
                value={form.username}
                onChange={update('username')}
                required
                minLength={3}
                maxLength={30}
                autoComplete="username"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">E-posta</label>
            <input
              id="email"
              className="form-input"
              type="email"
              placeholder="email@örnek.com"
              value={form.email}
              onChange={update('email')}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Şifre</label>
            <input
              id="password"
              className="form-input"
              type="password"
              placeholder={mode === 'register' ? 'En az 6 karakter' : 'Şifreniz'}
              value={form.password}
              onChange={update('password')}
              required
              minLength={6}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <p className="form-error">⚠️ {error}</p>}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '11px' }}
            disabled={loading}
            id="auth-submit-btn"
          >
            {loading
              ? 'Lütfen bekleyin...'
              : mode === 'register'
              ? 'Hesap Oluştur'
              : 'Giriş Yap'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              Hesabın yok mu?{' '}
              <a onClick={() => { setMode('register'); setError(''); }} id="switch-to-register">
                Kayıt ol
              </a>
            </>
          ) : (
            <>
              Zaten hesabın var mı?{' '}
              <a onClick={() => { setMode('login'); setError(''); }} id="switch-to-login">
                Giriş yap
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
