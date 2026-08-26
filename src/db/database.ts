import * as SQLite from 'expo-sqlite';
import { Link, Domain } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('linkgorize.db');
    await initializeDatabase(db);
  }
  return db;
}

async function initializeDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL UNIQUE,
      domain TEXT NOT NULL,
      title TEXT,
      description TEXT,
      favicon TEXT,
      og_image TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      is_read INTEGER NOT NULL DEFAULT 0,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      tags TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_links_domain ON links(domain);
    CREATE INDEX IF NOT EXISTS idx_links_created ON links(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_links_favorite ON links(is_favorite);
  `);
}

// ─── LINK QUERIES ────────────────────────────────────────────────────────────

export async function insertLink(
  db: SQLite.SQLiteDatabase,
  data: {
    url: string;
    domain: string;
    title?: string | null;
    description?: string | null;
    favicon?: string | null;
    og_image?: string | null;
  }
): Promise<number> {
  const result = await db.runAsync(
    `INSERT OR REPLACE INTO links (url, domain, title, description, favicon, og_image, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    data.url,
    data.domain,
    data.title ?? null,
    data.description ?? null,
    data.favicon ?? null,
    data.og_image ?? null,
    Date.now()
  );
  return result.lastInsertRowId;
}

export async function updateLinkMetadata(
  db: SQLite.SQLiteDatabase,
  id: number,
  data: {
    title?: string | null;
    description?: string | null;
    favicon?: string | null;
    og_image?: string | null;
  }
): Promise<void> {
  await db.runAsync(
    `UPDATE links SET title = ?, description = ?, favicon = ?, og_image = ? WHERE id = ?`,
    data.title ?? null,
    data.description ?? null,
    data.favicon ?? null,
    data.og_image ?? null,
    id
  );
}

export async function getAllLinks(db: SQLite.SQLiteDatabase): Promise<Link[]> {
  return await db.getAllAsync<Link>('SELECT * FROM links ORDER BY created_at DESC');
}

export async function getLinksByDomain(
  db: SQLite.SQLiteDatabase,
  domain: string
): Promise<Link[]> {
  return await db.getAllAsync<Link>(
    'SELECT * FROM links WHERE domain = ? ORDER BY created_at DESC',
    domain
  );
}

export async function getLinkById(
  db: SQLite.SQLiteDatabase,
  id: number
): Promise<Link | null> {
  return await db.getFirstAsync<Link>('SELECT * FROM links WHERE id = ?', id);
}

export async function searchLinks(
  db: SQLite.SQLiteDatabase,
  query: string
): Promise<Link[]> {
  const q = `%${query}%`;
  return await db.getAllAsync<Link>(
    `SELECT * FROM links 
     WHERE title LIKE ? OR url LIKE ? OR description LIKE ? OR domain LIKE ?
     ORDER BY created_at DESC`,
    q, q, q, q
  );
}

export async function toggleFavorite(
  db: SQLite.SQLiteDatabase,
  id: number,
  current: number
): Promise<void> {
  await db.runAsync(
    'UPDATE links SET is_favorite = ? WHERE id = ?',
    current === 1 ? 0 : 1,
    id
  );
}

export async function markAsRead(
  db: SQLite.SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('UPDATE links SET is_read = 1 WHERE id = ?', id);
}

export async function deleteLink(
  db: SQLite.SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM links WHERE id = ?', id);
}

export async function deleteAllByDomain(
  db: SQLite.SQLiteDatabase,
  domain: string
): Promise<void> {
  await db.runAsync('DELETE FROM links WHERE domain = ?', domain);
}

// ─── DOMAIN QUERIES ──────────────────────────────────────────────────────────

export async function getDomains(db: SQLite.SQLiteDatabase): Promise<Domain[]> {
  return await db.getAllAsync<Domain>(`
    SELECT 
      domain,
      COUNT(*) as count,
      MAX(favicon) as favicon,
      MAX(created_at) as last_added,
      SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_count
    FROM links
    GROUP BY domain
    ORDER BY last_added DESC
  `);
}

export async function getFavoriteLinks(db: SQLite.SQLiteDatabase): Promise<Link[]> {
  return await db.getAllAsync<Link>(
    'SELECT * FROM links WHERE is_favorite = 1 ORDER BY created_at DESC'
  );
}
