import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import PostCard from '../components/PostCard';

const PAGE_SIZE = 8;

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchPosts = useCallback(async (p) => {
    setLoading(true);
    try {
      const r = await api.get(`/posts?page=${p}&limit=${PAGE_SIZE}`);
      const newPosts = r.data.posts;
      if (p === 1) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }
      setHasMore(newPosts.length === PAGE_SIZE);
    } catch (err) {
      console.error('Feed yüklenemedi:', err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(next);
  };

  const handleDelete = (deletedId) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedId));
  };

  if (initialLoad) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <main className="page-container">
      <div className="feed-page">
        <div className="feed-header">
          <h1 className="feed-title">🕯️ Anı Akışı</h1>
          <p className="feed-subtitle">
            Patili dostlarımızın bıraktığı izler burada yaşamaya devam ediyor.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="feed-empty">
            <div className="feed-empty-icon">🌿</div>
            <p className="feed-empty-text">
              Henüz hiç anı paylaşılmamış.<br />
              İlk anıyı sen paylaşmak ister misin?
            </p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onDelete={handleDelete} />
            ))}

            {hasMore && (
              <button
                className="btn btn-outline load-more-btn"
                onClick={loadMore}
                disabled={loading}
                id="load-more-btn"
              >
                {loading ? 'Yükleniyor...' : 'Daha Fazla Göster'}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
