import { env } from "cloudflare:workers";

type SiteEnv = { DB?: D1Database };

export function getDatabase(): D1Database {
  const database = (env as unknown as SiteEnv).DB;
  if (!database) throw new Error("D1 veritabanı bağlantısı bulunamadı.");
  return database;
}

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const db = getDatabase();
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS rsvps (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('attending', 'maybe', 'declined')),
        guest_count INTEGER NOT NULL DEFAULT 0 CHECK (guest_count >= 0),
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS media_links (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_rsvps_status ON rsvps(status)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_rsvps_created_at ON rsvps(created_at)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_media_links_created_at ON media_links(created_at)"),
    ]);
    await db.prepare("PRAGMA optimize").run();
  })().catch((error) => { schemaReady = null; throw error; });
  return schemaReady;
}
