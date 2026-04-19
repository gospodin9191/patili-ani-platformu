import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        🐾 Patili <span>Anılar</span>
      </Link>

      <div className="navbar-actions">
        {user ? (
          <>
            <span className="navbar-username">@{user.username}</span>
            <Link to="/upload" className="btn btn-primary btn-sm" id="nav-upload-btn">
              + Paylaş
            </Link>
            <Link
              to={`/profile/${user.username}`}
              className="btn btn-ghost btn-sm"
              id="nav-profile-btn"
            >
              Profil
            </Link>
            {user.role === 'admin' && (
              <Link to="/admin" className="btn btn-ghost btn-sm" id="nav-admin-btn" style={{ color: 'var(--amber)' }}>
                🔑 Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-sm"
              id="nav-logout-btn"
            >
              Çıkış
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm" id="nav-login-btn">
              Giriş
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm" id="nav-register-btn">
              Kayıt Ol
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
