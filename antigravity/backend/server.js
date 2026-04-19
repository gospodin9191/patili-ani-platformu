const express = require('express');
const cors = require('cors');
const path = require('path');

// Veritabanını başlat
require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── MIDDLEWARE ────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statik dosyalar (yüklenen resimler)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── ROUTES ───────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));

// ─── SAĞLIK KONTROLÜ ──────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Patili Anılar API çalışıyor 🐾' });
});

// ─── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı.' });
});

// ─── HATA YÖNETİMİ ────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Sunucu hatası.' });
});

// ─── BAŞLAT ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🐾  Patili Anılar Backend              ║
  ║   🚀  http://localhost:${PORT}              ║
  ║   🕯️  Anılar kaybolmaz...                ║
  ╚══════════════════════════════════════════╝
  `);
});
