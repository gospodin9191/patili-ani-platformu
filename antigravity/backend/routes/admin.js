const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { adminMiddleware } = require('../middleware/adminAuth');

const router = express.Router();

// Tüm route'lar admin yetkisi gerektirir
router.use(adminMiddleware);

// ─── KULLANICILARI LİSTELE ─────────────────────────────────────
// GET /api/admin/users
router.get('/users', (_req, res) => {
  const users = db.prepare(`
    SELECT
      id, username, email, role, bio, created_at,
      (SELECT COUNT(*) FROM posts WHERE user_id = users.id) AS post_count
    FROM users
    ORDER BY created_at DESC
  `).all();

  res.json({ users });
});

// ─── KULLANICININ ROLÜNÜ DEĞİŞTİR ─────────────────────────────
// PATCH /api/admin/users/:id/role
// Body: { role: 'admin' | 'user' }
router.patch('/users/:id/role', (req, res) => {
  const { role } = req.body;

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: "Geçersiz rol. 'admin' veya 'user' olmalı." });
  }

  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

  // Kendini admin'den düşüremez (güvenlik)
  if (user.id === req.user.id && role === 'user') {
    return res.status(400).json({ error: 'Kendi admin yetkinizi kaldıramazsınız.' });
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user.id);

  res.json({
    message: `@${user.username} artık ${role === 'admin' ? '🔑 admin' : '👤 kullanıcı'}.`,
    user: { id: user.id, username: user.username, role },
  });
});

// ─── KULLANICIYA SİL ──────────────────────────────────────────
// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

  if (user.id === req.user.id) {
    return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz.' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  res.json({ message: `@${user.username} silindi.` });
});

// ─── TÜM POSTLARI LİSTELE ─────────────────────────────────────
// GET /api/admin/posts?page=1&limit=20
router.get('/posts', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const posts = db.prepare(`
    SELECT
      p.id, p.caption, p.image_url, p.pet_name, p.created_at,
      u.id AS user_id, u.username,
      (SELECT COUNT(*) FROM candles  WHERE post_id = p.id) AS candle_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) AS cnt FROM posts').get().cnt;

  res.json({ posts, total, page, limit });
});

// ─── POSTU SİL (ADMIN) ────────────────────────────────────────
// DELETE /api/admin/posts/:id
router.delete('/posts/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post bulunamadı.' });

  // Fiziksel dosyayı sil
  const filePath = path.join(__dirname, '..', post.image_url);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
  res.json({ message: 'Post silindi.' });
});

// ─── PANEL İSTATİSTİKLERİ ─────────────────────────────────────
// GET /api/admin/stats
router.get('/stats', (_req, res) => {
  const userCount    = db.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt;
  const postCount    = db.prepare('SELECT COUNT(*) AS cnt FROM posts').get().cnt;
  const commentCount = db.prepare('SELECT COUNT(*) AS cnt FROM comments').get().cnt;
  const candleCount  = db.prepare('SELECT COUNT(*) AS cnt FROM candles').get().cnt;

  res.json({ userCount, postCount, commentCount, candleCount });
});

module.exports = router;
