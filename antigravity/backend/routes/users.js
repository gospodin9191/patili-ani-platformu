const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ─── KULLANICI PROFİLİ ─────────────────────────────────────────
// GET /api/users/:username
router.get('/:username', (req, res) => {
  const user = db.prepare(
    'SELECT id, username, bio, avatar_url, created_at FROM users WHERE username = ?'
  ).get(req.params.username);

  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

  const posts = db.prepare(`
    SELECT
      p.id, p.caption, p.image_url, p.pet_name, p.memory_date, p.created_at,
      (SELECT COUNT(*) FROM candles WHERE post_id = p.id) AS candle_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count
    FROM posts p
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `).all(user.id);

  const stats = {
    post_count: posts.length,
    total_candles: posts.reduce((sum, p) => sum + p.candle_count, 0),
  };

  res.json({ user, posts, stats });
});

// ─── PROFİL GÜNCELLE ─────────────────────────────────────────
// PATCH /api/users/me/profile
// Body: { bio }
router.patch('/me/profile', authMiddleware, (req, res) => {
  const { bio } = req.body;

  db.prepare('UPDATE users SET bio = ? WHERE id = ?')
    .run(bio || '', req.user.id);

  const user = db.prepare('SELECT id, username, email, bio, avatar_url FROM users WHERE id = ?')
    .get(req.user.id);

  res.json({ message: 'Profil güncellendi.', user });
});

module.exports = router;
