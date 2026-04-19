const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// ─── KÜFÜR FİLTRESİ ────────────────────────────────────────────
const BAD_WORDS = [
  'küfür1', 'küfür2', 'orospu', 'siktir', 'amk', 'oç', 'göt',
  'bok', 'piç', 'pezevenk', 'kahpe', 'fuck', 'shit', 'ass', 'bitch',
];

function containsBadWords(text) {
  const lower = text.toLowerCase();
  return BAD_WORDS.some((w) => lower.includes(w));
}

// ─── TÜM POSTLAR (FEED) ────────────────────────────────────────
// GET /api/posts?page=1&limit=10
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // Mevcut kullanıcı var mı? (isteğe bağlı auth)
  let currentUserId = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('../middleware/auth');
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      currentUserId = decoded.id;
    } catch (_) {}
  }

  const posts = db.prepare(`
    SELECT
      p.id, p.caption, p.image_url, p.pet_name, p.memory_date, p.created_at,
      u.id AS user_id, u.username, u.avatar_url,
      (SELECT COUNT(*) FROM candles WHERE post_id = p.id) AS candle_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  // Kullanıcı mum bırakmış mı?
  if (currentUserId) {
    posts.forEach((p) => {
      const c = db.prepare('SELECT id FROM candles WHERE post_id = ? AND user_id = ?')
        .get(p.id, currentUserId);
      p.user_has_candle = !!c;
    });
  } else {
    posts.forEach((p) => (p.user_has_candle = false));
  }

  const total = db.prepare('SELECT COUNT(*) as cnt FROM posts').get().cnt;

  res.json({ posts, total, page, limit });
});

// ─── TEK POST ──────────────────────────────────────────────────
// GET /api/posts/:id
router.get('/:id', (req, res) => {
  const post = db.prepare(`
    SELECT
      p.id, p.caption, p.image_url, p.pet_name, p.memory_date, p.created_at,
      u.id AS user_id, u.username, u.avatar_url,
      (SELECT COUNT(*) FROM candles WHERE post_id = p.id) AS candle_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!post) return res.status(404).json({ error: 'Post bulunamadı.' });

  const comments = db.prepare(`
    SELECT c.id, c.content, c.created_at, u.username, u.avatar_url
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(post.id);

  res.json({ post, comments });
});

// ─── POST OLUŞTUR ──────────────────────────────────────────────
// POST /api/posts  (multipart/form-data)
// Fields: caption, pet_name, memory_date + image (dosya)
router.post('/', authMiddleware, upload.single('image'), (req, res) => {
  try {
    const { caption, pet_name, memory_date } = req.body;

    if (!caption || caption.trim() === '') {
      return res.status(400).json({ error: 'Caption boş olamaz.' });
    }

    if (containsBadWords(caption)) {
      return res.status(400).json({ error: 'Uygunsuz içerik tespit edildi.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Lütfen bir fotoğraf yükleyin.' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const result = db.prepare(`
      INSERT INTO posts (user_id, image_url, caption, pet_name, memory_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, imageUrl, caption.trim(), pet_name || '', memory_date || null);

    const post = db.prepare(`
      SELECT p.*, u.username, u.avatar_url
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Anın paylaşıldı 🕯️', post });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ─── POST SİL ─────────────────────────────────────────────────
// DELETE /api/posts/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post bulunamadı.' });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Bu postu silme yetkiniz yok.' });

  // Dosyayı sil
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '..', post.image_url);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
  res.json({ message: 'Post silindi.' });
});

// ─── MUM BIRAK / GERİ AL ───────────────────────────────────────
// POST /api/posts/:id/candle
router.post('/:id/candle', authMiddleware, (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.user.id;

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post bulunamadı.' });

  const existing = db.prepare('SELECT id FROM candles WHERE post_id = ? AND user_id = ?').get(postId, userId);

  if (existing) {
    // Mumu geri al
    db.prepare('DELETE FROM candles WHERE post_id = ? AND user_id = ?').run(postId, userId);
    const count = db.prepare('SELECT COUNT(*) as cnt FROM candles WHERE post_id = ?').get(postId).cnt;
    return res.json({ action: 'removed', candle_count: count });
  } else {
    // Mum bırak
    db.prepare('INSERT INTO candles (post_id, user_id) VALUES (?, ?)').run(postId, userId);
    const count = db.prepare('SELECT COUNT(*) as cnt FROM candles WHERE post_id = ?').get(postId).cnt;
    return res.json({ action: 'added', candle_count: count });
  }
});

// ─── YORUM EKLE ──────────────────────────────────────────────
// POST /api/posts/:id/comments
// Body: { content }
router.post('/:id/comments', authMiddleware, (req, res) => {
  const { content } = req.body;
  const postId = parseInt(req.params.id);

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Yorum boş olamaz.' });
  }

  if (containsBadWords(content)) {
    return res.status(400).json({ error: 'Uygunsuz içerik tespit edildi.' });
  }

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post bulunamadı.' });

  const result = db.prepare(
    'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)'
  ).run(postId, req.user.id, content.trim());

  const comment = db.prepare(`
    SELECT c.id, c.content, c.created_at, u.username, u.avatar_url
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ comment });
});

// ─── YORUMLARI GETİR ─────────────────────────────────────────
// GET /api/posts/:id/comments
router.get('/:id/comments', (req, res) => {
  const comments = db.prepare(`
    SELECT c.id, c.content, c.created_at, u.username, u.avatar_url
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.id);

  res.json({ comments });
});

module.exports = router;
