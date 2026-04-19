import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import PostCard from '../components/PostCard';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [view, setView] = useState('feed'); // 'feed' | 'grid'

  useEffect(() => {
    setLoading(true);
    api.get(`/users/${username}`)
      .then((r) => {
        setData(r.data);
        setBio(r.data.user.bio || '');
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [username, navigate]);

  const isOwn = currentUser?.username === username;

  const saveBio = async () => {
    setSavingBio(true);
    try {
      const r = await api.patch('/users/me/profile', { bio });
      setData((prev) => ({ ...prev, user: r.data.user }));
      setEditingBio(false);
    } catch {
      alert('Kaydedilemedi.');
    } finally {
      setSavingBio(false);
    }
  };

  const handleDelete = (deletedId) => {
    setData((prev) => ({
      ...prev,
      posts: prev.posts.filter((p) => p.id !== deletedId),
      stats: { ...prev.stats, post_count: prev.stats.post_count - 1 },
    }));
  };

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  if (!data) return null;

  const { user, posts, stats } = data;
  const initials = user.username?.[0]?.toUpperCase() || '?';

  return (
    <main className="page-container">
      {/* Profil başlık */}
      <div className="profile-header">
        <div className="avatar avatar--lg">{initials}</div>

        <div className="profile-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h1 className="profile-username">@{user.username}</h1>
            {isOwn && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setEditingBio((v) => !v)}
                id="edit-bio-btn"
              >
                {editingBio ? 'İptal' : 'Düzenle'}
              </button>
            )}
          </div>

          {editingBio ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                className="form-input"
                style={{ flex: 1 }}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Kendinizi tanıtın..."
                maxLength={200}
                id="bio-input"
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={saveBio}
                disabled={savingBio}
                id="save-bio-btn"
              >
                {savingBio ? '...' : 'Kaydet'}
              </button>
            </div>
          ) : (
            <p className="profile-bio">
              {user.bio || (isOwn ? 'Henüz bir biyografi eklemedin.' : '')}
            </p>
          )}

          <div className="profile-stats">
            <div className="profile-stat">
              <div className="profile-stat-value">{stats.post_count}</div>
              <div className="profile-stat-label">Anı</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value">{stats.total_candles}</div>
              <div className="profile-stat-label">🕯️ Mum</div>
            </div>
          </div>
        </div>
      </div>

      {/* Görünüm seçici */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <button
          className={`btn btn-ghost btn-sm ${view === 'feed' ? 'btn-primary' : ''}`}
          onClick={() => setView('feed')}
          id="view-feed-btn"
          style={view === 'feed' ? { background: 'var(--amber)', color: '#0a0a0b' } : {}}
        >
          📋 Liste
        </button>
        <button
          className={`btn btn-ghost btn-sm`}
          onClick={() => setView('grid')}
          id="view-grid-btn"
          style={view === 'grid' ? { background: 'var(--amber)', color: '#0a0a0b' } : {}}
        >
          ⊞ Izgara
        </button>
      </div>

      {/* Postlar */}
      {posts.length === 0 ? (
        <div className="feed-empty">
          <div className="feed-empty-icon">🌿</div>
          <p className="feed-empty-text">
            {isOwn
              ? 'Henüz hiç anı paylaşmadın.'
              : 'Bu kullanıcı henüz hiç anı paylaşmamış.'}
          </p>
          {isOwn && (
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => navigate('/upload')}
              id="go-upload-btn"
            >
              İlk Anını Paylaş
            </button>
          )}
        </div>
      ) : view === 'feed' ? (
        posts.map((p) => (
          <PostCard
            key={p.id}
            post={{ ...p, username: user.username, user_id: user.id }}
            onDelete={handleDelete}
          />
        ))
      ) : (
        <div className="profile-grid">
          {posts.map((p) => (
            <div
              key={p.id}
              className="profile-grid-item"
              onClick={() => navigate(`/profile/${username}`)}
            >
              <img src={p.image_url} alt={p.pet_name || 'Anı'} loading="lazy" />
              <div className="profile-grid-overlay">
                <span>🕯️ {p.candle_count}</span>
                <span>💬 {p.comment_count}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
