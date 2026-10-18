import * as SQLite from 'expo-sqlite';
import { FolderRecord, LinkRecord, SCHEMA_SQL } from './schema';
import { ScrapedMetadata } from '../services/metadataScraper';
import { ParsedDomainInfo } from '../services/domainParser';

export type { FolderRecord, LinkRecord };

const DB_NAME = 'rungorize.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  const db = getDatabase();
  await db.execAsync(SCHEMA_SQL);
}

// Generate simple unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// ================= FOLDERS ================= //

export async function getFolders(): Promise<FolderRecord[]> {
  const db = getDatabase();
  const query = `
    SELECT f.*, COUNT(l.id) AS link_count
    FROM folders f
    LEFT JOIN links l ON f.id = l.folder_id
    GROUP BY f.id
    ORDER BY f.is_pinned DESC, f.updated_at DESC;
  `;
  const rows = await db.getAllAsync<FolderRecord>(query);
  return rows;
}

export async function getFolderById(folderId: string): Promise<FolderRecord | null> {
  const db = getDatabase();
  const query = `
    SELECT f.*, COUNT(l.id) AS link_count
    FROM folders f
    LEFT JOIN links l ON f.id = l.folder_id
    WHERE f.id = ?
    GROUP BY f.id;
  `;
  return await db.getFirstAsync<FolderRecord>(query, [folderId]);
}

export async function upsertFolder(domainInfo: ParsedDomainInfo): Promise<FolderRecord> {
  const db = getDatabase();
  const now = Date.now();

  const existing = await db.getFirstAsync<FolderRecord>(
    'SELECT * FROM folders WHERE domain = ?',
    [domainInfo.rootDomain]
  );

  if (existing) {
    return existing;
  }

  const id = generateId();
  await db.runAsync(
    `INSERT INTO folders (id, domain, display_name, icon_url, color, is_pinned, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      id,
      domainInfo.rootDomain,
      domainInfo.displayName,
      domainInfo.faviconUrl,
      domainInfo.accentColor,
      now,
      now,
    ]
  );

  return {
    id,
    domain: domainInfo.rootDomain,
    display_name: domainInfo.displayName,
    icon_url: domainInfo.faviconUrl,
    color: domainInfo.accentColor,
    is_pinned: 0,
    created_at: now,
    updated_at: now,
    link_count: 0,
  };
}

export async function updateFolder(
  id: string,
  updates: Partial<Pick<FolderRecord, 'display_name' | 'color' | 'is_pinned'>>
): Promise<void> {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.display_name !== undefined) {
    fields.push('display_name = ?');
    values.push(updates.display_name);
  }
  if (updates.color !== undefined) {
    fields.push('color = ?');
    values.push(updates.color);
  }
  if (updates.is_pinned !== undefined) {
    fields.push('is_pinned = ?');
    values.push(updates.is_pinned);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);

  await db.runAsync(`UPDATE folders SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteFolder(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM links WHERE folder_id = ?', [id]);
  await db.runAsync('DELETE FROM folders WHERE id = ?', [id]);
}

// ================= LINKS ================= //

export interface SaveLinkResult {
  link: LinkRecord;
  folder: FolderRecord;
  isExisting: boolean;
}

export async function saveLinkFromMetadata(
  meta: ScrapedMetadata,
  notes?: string,
  tags?: string[]
): Promise<SaveLinkResult> {
  const db = getDatabase();
  const now = Date.now();

  const folder = await upsertFolder(meta.domainInfo);

  // Check if link already exists by clean_url
  const existing = await db.getFirstAsync<LinkRecord>(
    'SELECT * FROM links WHERE clean_url = ?',
    [meta.cleanUrl]
  );

  if (existing) {
    // Deduplication rule: Bump updated_at and update title/description if improved
    await db.runAsync(
      `UPDATE links 
       SET updated_at = ?, 
           title = COALESCE(?, title), 
           description = COALESCE(?, description),
           image_url = COALESCE(?, image_url)
       WHERE id = ?`,
      [now, meta.title, meta.description, meta.imageUrl, existing.id]
    );

    // Update folder updated_at as well
    await db.runAsync('UPDATE folders SET updated_at = ? WHERE id = ?', [now, folder.id]);

    const updated = await db.getFirstAsync<LinkRecord>('SELECT * FROM links WHERE id = ?', [
      existing.id,
    ]);

    return {
      link: updated || existing,
      folder,
      isExisting: true,
    };
  }

  const id = generateId();
  const tagsJson = JSON.stringify(tags || []);

  await db.runAsync(
    `INSERT INTO links (
      id, folder_id, original_url, clean_url, title, description,
      image_url, favicon_url, is_favorite, is_read, notes, tags, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`,
    [
      id,
      folder.id,
      meta.url,
      meta.cleanUrl,
      meta.title,
      meta.description,
      meta.imageUrl,
      meta.faviconUrl,
      notes || null,
      tagsJson,
      now,
      now,
    ]
  );

  await db.runAsync('UPDATE folders SET updated_at = ? WHERE id = ?', [now, folder.id]);

  const newLink: LinkRecord = {
    id,
    folder_id: folder.id,
    original_url: meta.url,
    clean_url: meta.cleanUrl,
    title: meta.title,
    description: meta.description,
    image_url: meta.imageUrl,
    favicon_url: meta.faviconUrl,
    is_favorite: 0,
    is_read: 0,
    notes: notes || null,
    tags: tagsJson,
    created_at: now,
    updated_at: now,
  };

  return {
    link: newLink,
    folder,
    isExisting: false,
  };
}

export async function getLinks(options?: {
  folderId?: string;
  isFavorite?: boolean;
  isRead?: boolean;
  search?: string;
}): Promise<LinkRecord[]> {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: any[] = [];

  if (options?.folderId) {
    conditions.push('l.folder_id = ?');
    params.push(options.folderId);
  }
  if (options?.isFavorite !== undefined) {
    conditions.push('l.is_favorite = ?');
    params.push(options.isFavorite ? 1 : 0);
  }
  if (options?.isRead !== undefined) {
    conditions.push('l.is_read = ?');
    params.push(options.isRead ? 1 : 0);
  }
  if (options?.search && options.search.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push('(l.title LIKE ? OR l.description LIKE ? OR l.clean_url LIKE ? OR l.notes LIKE ?)');
    params.push(term, term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT l.*, f.domain AS folder_domain, f.display_name AS folder_display_name, f.color AS folder_color
    FROM links l
    JOIN folders f ON l.folder_id = f.id
    ${whereClause}
    ORDER BY l.updated_at DESC;
  `;

  return await db.getAllAsync<LinkRecord>(query, params);
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const db = getDatabase();
  const current = await db.getFirstAsync<{ is_favorite: number }>(
    'SELECT is_favorite FROM links WHERE id = ?',
    [id]
  );
  if (!current) return false;
  const next = current.is_favorite === 1 ? 0 : 1;
  await db.runAsync('UPDATE links SET is_favorite = ?, updated_at = ? WHERE id = ?', [
    next,
    Date.now(),
    id,
  ]);
  return next === 1;
}

export async function toggleRead(id: string): Promise<boolean> {
  const db = getDatabase();
  const current = await db.getFirstAsync<{ is_read: number }>(
    'SELECT is_read FROM links WHERE id = ?',
    [id]
  );
  if (!current) return false;
  const next = current.is_read === 1 ? 0 : 1;
  await db.runAsync('UPDATE links SET is_read = ?, updated_at = ? WHERE id = ?', [
    next,
    Date.now(),
    id,
  ]);
  return next === 1;
}

export async function updateLink(
  id: string,
  updates: Partial<Pick<LinkRecord, 'title' | 'description' | 'notes' | 'tags' | 'folder_id'>>
): Promise<void> {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes);
  }
  if (updates.tags !== undefined) {
    fields.push('tags = ?');
    values.push(updates.tags);
  }
  if (updates.folder_id !== undefined) {
    fields.push('folder_id = ?');
    values.push(updates.folder_id);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);

  await db.runAsync(`UPDATE links SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteLink(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM links WHERE id = ?', [id]);
}

// ================= BACKUP & RESTORE ================= //

export interface BackupData {
  version: number;
  exportedAt: number;
  folders: FolderRecord[];
  links: LinkRecord[];
}

export async function exportDatabaseBackup(): Promise<BackupData> {
  const db = getDatabase();
  const folders = await db.getAllAsync<FolderRecord>('SELECT * FROM folders');
  const links = await db.getAllAsync<LinkRecord>('SELECT * FROM links');
  return {
    version: 1,
    exportedAt: Date.now(),
    folders,
    links,
  };
}

export async function importDatabaseBackup(data: BackupData): Promise<{ foldersCount: number; linksCount: number }> {
  const db = getDatabase();
  if (!data || !Array.isArray(data.folders) || !Array.isArray(data.links)) {
    throw new Error('Geçersiz yedek dosyası formatı');
  }

  let foldersCount = 0;
  let linksCount = 0;

  for (const f of data.folders) {
    await db.runAsync(
      `INSERT OR REPLACE INTO folders (id, domain, display_name, icon_url, color, is_pinned, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [f.id, f.domain, f.display_name, f.icon_url, f.color || '#3b82f6', f.is_pinned || 0, f.created_at, f.updated_at]
    );
    foldersCount++;
  }

  for (const l of data.links) {
    await db.runAsync(
      `INSERT OR REPLACE INTO links (
        id, folder_id, original_url, clean_url, title, description,
        image_url, favicon_url, is_favorite, is_read, notes, tags, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        l.id,
        l.folder_id,
        l.original_url,
        l.clean_url,
        l.title,
        l.description,
        l.image_url,
        l.favicon_url,
        l.is_favorite || 0,
        l.is_read || 0,
        l.notes,
        l.tags || '[]',
        l.created_at,
        l.updated_at,
      ]
    );
    linksCount++;
  }

  return { foldersCount, linksCount };
}
