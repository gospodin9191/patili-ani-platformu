const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./auth');
const db = require('../database');

/**
 * Admin kontrol middleware'i.
 * Önce JWT doğrular, ardından DB'den kullanıcının role'ünü kontrol eder.
 * Sadece role = 'admin' olan kullanıcılar geçebilir.
 */
function adminMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token.' });
  }

  // DB'den güncel role bilgisini al (token'daki role stale olabilir)
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(decoded.id);
  if (!user) {
    return res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Bu sayfaya erişim yetkiniz yok.' });
  }

  req.user = { ...decoded, role: user.role };
  next();
}

module.exports = { adminMiddleware };
