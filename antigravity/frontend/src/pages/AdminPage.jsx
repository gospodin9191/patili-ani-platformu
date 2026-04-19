import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

// ── Küçük yardımcı ────────────────────────────────────────────
function StatCard({ label, value, icon }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}>
      <span style={{ fontSize: '1.8rem' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      </div>
    </div>
  );
}

// ── Bölüm başlığı ─────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontSize: '1rem',
      fontWeight: 700,
      color: 'var(--text-primary)',
      margin: '28px 0 12px',
      paddingBottom: 10,
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      {children}
    </h2>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('users'); // 'users' | 'posts'
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // Admin değilse yönlendir
  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'admin') { navigate('/'); return; }
  }, [user, navigate]);

  const showMsg = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  };

  // İstatistikler
  const loadStats = useCallback(async () => {
    try {
      const r = await api.get('/admin/stats');
      setStats(r.data);
    } catch {}
  }, []);

  // Kullanıcılar
  const loadUsers = useCallback(async () => {
    try {
      const r = await api.get('/admin/users');
      setUsers(r.data.users);
    } catch {}
  }, []);

  // Postlar
  const loadPosts = useCallback(async () => {
    try {
      const r = await api.get('/admin/posts?limit=50');
      setPosts(r.data.posts);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    setLoading(true);
    Promise.all([loadStats(), loadUsers(), loadPosts()])
      .finally(() => setLoading(false));
  }, [loadStats, loadUsers, loadPosts, user]);

  // Kullanıcı rolünü değiştir
  const toggleRole = async (u) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`@${u.username} kullanıcısını ${newRole === 'admin' ? 'admin yap' : 'admin yetkisini kaldır'}?`)) return;
    try {
      const r = await api.patch(`/admin/users/${u.id}/role`, { role: newRole });
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, role: newRole } : x));
      showMsg(r.data.message);
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Hata oluştu.'));
    }
  };

  // Kullanıcı sil
  const deleteUser = async (u) => {
    if (!window.confirm(`@${u.username} kullanıcısını ve tüm içeriklerini silmek istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      showMsg(`✅ @${u.username} silindi.`);
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Hata oluştu.'));
    }
  };

  // Post sil
  const deletePost = async (postId) => {
    if (!window.confirm('Bu postu silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/admin/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      loadStats();
      showMsg('✅ Post silindi.');
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Hata oluştu.'));
    }
  };

  const formatDate = (dt) => {
    if (!dt) return '-';
    return new Date(dt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (!user || user.role !== 'admin') return null;

  // ── Tablo stili (inline, sade) ───────────────────────────────
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
  };
  const thStyle = {
    padding: '8px 12px',
    textAlign: 'left',
    color: 'var(--text-muted)',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)',
  };
  const tdStyle = {
    padding: '10px 12px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  };

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            🔑 Admin Paneli
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Giriş yapan: <strong style={{ color: 'var(--amber)' }}>@{user.username}</strong>
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} id="admin-back-btn">
          ← Ana Sayfa
        </button>
      </div>

      {/* Toast mesaj */}
      {msg && (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-light)',
          borderLeft: '3px solid var(--amber)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          fontSize: '0.875rem',
          color: 'var(--text-primary)',
          marginBottom: 20,
        }}>
          {msg}
        </div>
      )}

      {/* İstatistikler */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 8 }}>
          <StatCard icon="👤" label="Kullanıcı" value={stats.userCount} />
          <StatCard icon="📷" label="Post" value={stats.postCount} />
          <StatCard icon="💬" label="Yorum" value={stats.commentCount} />
          <StatCard icon="🕯️" label="Mum" value={stats.candleCount} />
        </div>
      )}

      {/* Tab seçici */}
      <div style={{ display: 'flex', gap: 4, marginTop: 24, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', padding: 4, width: 'fit-content' }}>
        {[
          { key: 'users', label: `👤 Kullanıcılar (${users.length})` },
          { key: 'posts', label: `📷 Postlar (${posts.length})` },
        ].map((t) => (
          <button
            key={t.key}
            id={`admin-tab-${t.key}`}
            onClick={() => setTab(t.key)}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: tab === t.key ? 'var(--amber)' : 'transparent',
              color: tab === t.key ? '#0a0a0b' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="loading-spinner" style={{ padding: 40 }}>
          <div className="spinner" />
        </div>
      )}

      {/* ── KULLANICILAR TABLOSU ── */}
      {!loading && tab === 'users' && (
        <>
          <SectionTitle>👤 Tüm Kullanıcılar</SectionTitle>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Kullanıcı</th>
                  <th style={thStyle}>E-posta</th>
                  <th style={thStyle}>Rol</th>
                  <th style={thStyle}>Post</th>
                  <th style={thStyle}>Kayıt</th>
                  <th style={thStyle}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ transition: 'background 0.1s' }}>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.75rem' }}>#{u.id}</td>
                    <td style={tdStyle}>
                      <span
                        style={{ color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => navigate(`/profile/${u.username}`)}
                      >
                        @{u.username}
                      </span>
                    </td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: u.role === 'admin' ? 'rgba(245,158,11,0.15)' : 'var(--bg-hover)',
                        color: u.role === 'admin' ? 'var(--amber)' : 'var(--text-muted)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}>
                        {u.role === 'admin' ? '🔑 admin' : '👤 user'}
                      </span>
                    </td>
                    <td style={tdStyle}>{u.post_count}</td>
                    <td style={{ ...tdStyle, fontSize: '0.78rem' }}>{formatDate(u.created_at)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => toggleRole(u)}
                          id={`toggle-role-${u.id}`}
                          style={{
                            fontSize: '0.75rem',
                            padding: '4px 10px',
                            borderColor: u.role === 'admin' ? 'var(--text-muted)' : 'var(--amber)',
                            color: u.role === 'admin' ? 'var(--text-muted)' : 'var(--amber)',
                          }}
                        >
                          {u.role === 'admin' ? 'Admin Kaldır' : 'Admin Yap'}
                        </button>
                        {u.id !== user.id && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => deleteUser(u)}
                            id={`delete-user-${u.id}`}
                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          >
                            Sil
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── POSTLAR TABLOSU ── */}
      {!loading && tab === 'posts' && (
        <>
          <SectionTitle>📷 Tüm Postlar</SectionTitle>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Fotoğraf</th>
                  <th style={thStyle}>Kullanıcı</th>
                  <th style={thStyle}>Dost Adı</th>
                  <th style={thStyle}>Açıklama</th>
                  <th style={thStyle}>🕯️</th>
                  <th style={thStyle}>💬</th>
                  <th style={thStyle}>Tarih</th>
                  <th style={thStyle}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.75rem' }}>#{p.id}</td>
                    <td style={tdStyle}>
                      <img
                        src={p.image_url}
                        alt=""
                        style={{
                          width: 48,
                          height: 48,
                          objectFit: 'cover',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                        }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{ color: 'var(--amber)', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => navigate(`/profile/${p.username}`)}
                      >
                        @{p.username}
                      </span>
                    </td>
                    <td style={tdStyle}>{p.pet_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ ...tdStyle, maxWidth: 220 }}>
                      <span style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4,
                      }}>
                        {p.caption}
                      </span>
                    </td>
                    <td style={tdStyle}>{p.candle_count}</td>
                    <td style={tdStyle}>{p.comment_count}</td>
                    <td style={{ ...tdStyle, fontSize: '0.78rem' }}>{formatDate(p.created_at)}</td>
                    <td style={tdStyle}>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deletePost(p.id)}
                        id={`admin-delete-post-${p.id}`}
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {posts.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                Henüz post yok.
              </p>
            )}
          </div>
        </>
      )}
    </main>
  );
}
