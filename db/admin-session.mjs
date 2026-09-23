const SESSION_VERSION_KEY = "admin_session_version";
const INITIAL_VERSION = "initial";

export async function getAdminSessionVersion(db) {
  return await db.prepare("SELECT value FROM settings WHERE key = ?").bind(SESSION_VERSION_KEY).first("value") ?? INITIAL_VERSION;
}

export async function revokeAdminSessions(db, now = new Date().toISOString()) {
  const version = crypto.randomUUID();
  await db.batch([
    db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind(SESSION_VERSION_KEY, version, now),
    db.prepare("INSERT INTO security_events (id, event_type, fingerprint, created_at) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), "admin_sessions_revoked", "admin", now),
  ]);
  return version;
}
