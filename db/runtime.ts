import { env } from "cloudflare:workers";

type SiteEnv = { DB?: D1Database };

export function getDatabase(): D1Database {
  const database = (env as unknown as SiteEnv).DB;
  if (!database) throw new Error("D1 veritabanı bağlantısı bulunamadı.");
  return database;
}

let schemaReady: Promise<void> | null = null;

// Drizzle migrations own the schema. Runtime only checks readiness.
export function ensureSchema(): Promise<void> {
  return schemaReady ??= getDatabase().batch([
    getDatabase().prepare("SELECT id, deleted_at FROM rsvps LIMIT 0"),
    getDatabase().prepare("SELECT id, deleted_at FROM media_links LIMIT 0"),
    getDatabase().prepare("SELECT key FROM settings LIMIT 0"),
    getDatabase().prepare("SELECT id FROM security_events LIMIT 0"),
  ]).then(() => {}).catch((error) => { schemaReady = null; throw error; });
}
