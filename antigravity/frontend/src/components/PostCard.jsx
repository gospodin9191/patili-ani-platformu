import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

// Yorum bölümü ayrı component
function CommentsSection({ postId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    api.get(`/posts/${postId}/comments`)
      .then((r) => setComments(r.data.comments));
  }, [postId]);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const r = await api.post(`/posts/${postId}/comments`, { content: text });
      setComments((prev) => [...prev, r.data.comment]);
      setText('');
    } catch (err) {
      alert(err.response?.data?.error || 'Yorum gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const formatTime = (dt) => {
    const d = new Date(dt);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="comments-section">
      {comments.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 12 }}>
          Henüz yorum yok. İlk yorumu sen bırak 🕯️
        </p>
      )}

      {comments.map((c) => (
        <div key={c.id} className="comment-item">
          <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>
            {c.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="comment-bubble">
            <div className="comment-author">{c.username}</div>
            <div className="comment-content">{c.content}</div>
            <div className="comment-time">{formatTime(c.created_at)}</div>
          </div>
        </div>
      ))}

      {user && (
        <div className="comment-form">
          <input
            ref={inputRef}
            className="comment-input"
            placeholder="Bir anı paylaş..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
            id={`comment-input-${postId}`}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={submit}
            disabled={loading || !text.trim()}
            id={`comment-submit-${postId}`}
          >
            {loading ? '...' : 'Gönder'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── ANA POST KARTI ─────────────────────────────────────────────
export default function PostCard({ post: initialPost, onDelete }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [candleAnimating, setCandleAnimating] = useState(false);

  const formatDate = (dt) => {
    const d = new Date(dt);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const handleCandle = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const r = await api.post(`/posts/${post.id}/candle`);
      setPost((prev) => ({
        ...prev,
        candle_count: r.data.candle_count,
        user_has_candle: r.data.action === 'added',
      }));
      setCandleAnimating(true);
      setTimeout(() => setCandleAnimating(false), 400);
    } catch (err) {
      alert(err.response?.data?.error || 'Bir hata oluştu.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bu anıyı silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/posts/${post.id}`);
      if (onDelete) onDelete(post.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Silinemedi.');
    }
  };

  const initials = post.username?.[0]?.toUpperCase() || '?';

  return (
    <article className="card post-card">
      {/* Header */}
      <div className="post-header">
        <div className="post-author">
          <div className="avatar">{initials}</div>
          <div className="post-author-info">
            <span
              className="post-author-name"
              onClick={() => navigate(`/profile/${post.username}`)}
              role="link"
            >
              @{post.username}
            </span>
            <span className="post-author-date">{formatDate(post.created_at)}</span>
          </div>
        </div>

        {user?.id === post.user_id && (
          <button
            className="btn btn-danger btn-sm"
            onClick={handleDelete}
            id={`delete-post-${post.id}`}
          >
            Sil
          </button>
        )}
      </div>

      {/* Fotoğraf */}
      <div className="post-image-wrapper">
        <img
          src={post.image_url}
          alt={post.pet_name || 'Anı fotoğrafı'}
          loading="lazy"
        />
      </div>

      {/* İçerik */}
      <div className="post-body">
        {post.pet_name && (
          <div className="post-pet-name">
            ✨ {post.pet_name}
            {post.memory_date && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                · {new Date(post.memory_date).toLocaleDateString('tr-TR')}
              </span>
            )}
          </div>
        )}
        <p className="post-caption">{post.caption}</p>
      </div>

      {/* Aksiyonlar */}
      <div className="post-actions">
        <button
          className={`candle-btn ${post.user_has_candle ? 'active' : ''}`}
          onClick={handleCandle}
          id={`candle-btn-${post.id}`}
          aria-label="Mum bırak"
        >
          <span className="candle-icon">🕯️</span>
          <span className={candleAnimating ? 'candle-count-animate' : ''}>
            {post.candle_count}
          </span>
        </button>

        <button
          className="comment-toggle-btn"
          onClick={() => setShowComments((v) => !v)}
          id={`toggle-comments-${post.id}`}
        >
          💬 {post.comment_count ?? 0}
        </button>
      </div>

      {/* Yorumlar */}
      {showComments && <CommentsSection postId={post.id} />}
    </article>
  );
}
