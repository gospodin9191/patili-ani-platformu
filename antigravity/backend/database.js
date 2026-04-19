/**
 * database.js
 *
 * node-sqlite3-wasm kullanır — pure JavaScript, C++ derleme gerektirmez.
 * better-sqlite3 uyumlu bir wrapper sağlar:
 *   db.prepare(sql).get(...params)
 *   db.prepare(sql).all(...params)
 *   db.prepare(sql).run(...params)  → { lastInsertRowid, changes }
 *   db.exec(sql)
 */

const { Database: WasmDB } = require('node-sqlite3-wasm');
const path = require('path');

const DB_PATH = path.join(__dirname, 'patili_anilar.db');
const _db = new WasmDB(DB_PATH);

// ── PRAGMA ──────────────────────────────────────────────────────
_db.run('PRAGMA journal_mode = WAL;');
_db.run('PRAGMA foreign_keys = ON;');

// ── TABLOLAR ────────────────────────────────────────────────────
_db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT UNIQUE NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    avatar_url  TEXT DEFAULT NULL,
    bio         TEXT DEFAULT '',
    role        TEXT DEFAULT 'user',
    created_at  TEXT DEFAULT (datetime('now'))
  )
`);

// Mevcut DB'ye role kolonu yoksa ekle (migration)
try {
  _db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
} catch (_) { /* Zaten varsa hata ver, görmezden gel */ }

_db.run(`
  CREATE TABLE IF NOT EXISTS posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    image_url   TEXT NOT NULL,
    caption     TEXT NOT NULL,
    pet_name    TEXT DEFAULT '',
    memory_date TEXT DEFAULT NULL,
    created_at  TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

_db.run(`
  CREATE TABLE IF NOT EXISTS candles (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id    INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

_db.run(`
  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id    INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

console.log('✅ Veritabanı hazır:', DB_PATH);
console.log('✅ Rol sistemi aktif (user / admin)');

// ── BETTER-SQLITE3 UYUMLU WRAPPER ───────────────────────────────
const db = {
  /**
   * Returns a statement-like object with .get(), .all(), .run()
   * Matches better-sqlite3's synchronous API.
   */
  prepare(sql) {
    return {
      get(...args) {
        // node-sqlite3-wasm: db.get(sql, params) → single row object or undefined
        return _db.get(sql, args.length ? args : undefined);
      },
      all(...args) {
        // node-sqlite3-wasm: db.all(sql, params) → array of row objects
        return _db.all(sql, args.length ? args : undefined);
      },
      run(...args) {
        // node-sqlite3-wasm: db.run(sql, params) → void
        _db.run(sql, args.length ? args : undefined);
        // Retrieve last insert rowid and changes count
        const rowid = _db.get('SELECT last_insert_rowid() as id')?.id ?? 0;
        const changes = _db.get('SELECT changes() as c')?.c ?? 0;
        return { lastInsertRowid: rowid, changes };
      },
    };
  },

  exec(sql) {
    // Split on semicolons for multi-statement exec (node-sqlite3-wasm's run handles one at a time)
    const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      _db.run(stmt + ';');
    }
  },
};

module.exports = db;
