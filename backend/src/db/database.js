import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../database.db');

let db;

export function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        console.log('✅ Connected to SQLite database');
      }
    });
  }
  return db;
}

// Same schema as ../../schema.sql (Cloudflare D1) so both deployments behave alike.
const WATCHLIST_SQL = `
  CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    movie_id TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'movie',
    title TEXT,
    overview TEXT,
    poster_path TEXT,
    release_date TEXT,
    rating REAL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, movie_id, media_type)
  )
`;

export async function initializeDatabase() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrate the old watchlist (movie_id → movies table, no media type) to the
  // self-contained schema that can hold both movies and series.
  const cols = await allQuery('PRAGMA table_info(watchlist)');
  if (cols.length > 0 && !cols.some((c) => c.name === 'media_type')) {
    const hasMovies = (await allQuery("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'movies'")).length > 0;
    await runQuery('ALTER TABLE watchlist RENAME TO watchlist_old');
    await runQuery(WATCHLIST_SQL);
    await runQuery(hasMovies
      ? `INSERT OR IGNORE INTO watchlist (user_id, movie_id, media_type, title, overview, poster_path, release_date, rating, added_at)
         SELECT w.user_id, CAST(w.movie_id AS TEXT), 'movie', m.title, m.overview, m.poster_path, m.release_date, m.rating, w.added_at
         FROM watchlist_old w LEFT JOIN movies m ON m.id = w.movie_id`
      : `INSERT OR IGNORE INTO watchlist (user_id, movie_id, media_type, added_at)
         SELECT user_id, CAST(movie_id AS TEXT), 'movie', added_at FROM watchlist_old`);
    await runQuery('DROP TABLE watchlist_old');
    await runQuery('DROP TABLE IF EXISTS movies');
    console.log('✅ Migrated watchlist to movies + series schema');
  } else {
    await runQuery(WATCHLIST_SQL);
  }

  console.log('✅ Database tables initialized');
}

export function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

export function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}
