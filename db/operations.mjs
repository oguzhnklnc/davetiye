import { findPotentialDuplicatePairs } from "../app/duplicate-rsvps.mjs";
import { backupHealth, MANUAL_CHECKLIST_KEYS, parseChecklist } from "../app/operations.mjs";

export async function getOperationalSnapshot(db, now = Date.now()) {
  const cutoff = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const results = await db.batch([
    db.prepare(`SELECT
      SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) AS active_count,
      SUM(CASE WHEN deleted_at IS NULL AND status = 'attending' THEN guest_count ELSE 0 END) AS guest_total,
      SUM(CASE WHEN deleted_at IS NULL AND status = 'maybe' THEN 1 ELSE 0 END) AS maybe_count,
      SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) AS trash_count,
      SUM(CASE WHEN deleted_at IS NULL AND (length(trim(name)) < 2 OR status NOT IN ('attending','maybe','declined') OR (status = 'attending' AND guest_count < 1) OR (status != 'attending' AND guest_count != 0) OR length(note) > 500) THEN 1 ELSE 0 END) AS invalid_count,
      MAX(CASE WHEN deleted_at IS NULL THEN created_at END) AS last_submission_at
      FROM rsvps`),
    db.prepare(`SELECT
      SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) AS active_count,
      SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) AS trash_count,
      SUM(CASE WHEN deleted_at IS NULL AND (length(trim(name)) < 2 OR length(url) > 2048 OR url NOT LIKE 'https://%') THEN 1 ELSE 0 END) AS invalid_count,
      MAX(CASE WHEN deleted_at IS NULL THEN created_at END) AS last_submission_at
      FROM media_links`),
    db.prepare("SELECT key, value FROM settings WHERE key IN ('album_url', 'operations_checklist')"),
    db.prepare(`SELECT
      MAX(CASE WHEN event_type = 'admin_backup_exported' THEN created_at END) AS last_backup_at,
      SUM(CASE WHEN event_type = 'admin_login_failed' AND created_at >= ? THEN 1 ELSE 0 END) AS failed_logins_24h
      FROM security_events`).bind(cutoff),
    db.prepare("SELECT id, name FROM rsvps WHERE deleted_at IS NULL ORDER BY created_at DESC"),
  ]);
  const rsvp = results[0].results[0] ?? {};
  const media = results[1].results[0] ?? {};
  const settings = Object.fromEntries(results[2].results.map((row) => [row.key, row.value]));
  const security = results[3].results[0] ?? {};
  const lastSubmissionAt = [rsvp.last_submission_at, media.last_submission_at].filter(Boolean).sort().at(-1) ?? null;
  const lastBackupAt = security.last_backup_at ?? null;
  return {
    checkedAt: new Date(now).toISOString(),
    database: "ok",
    activeRsvps: Number(rsvp.active_count ?? 0),
    guestTotal: Number(rsvp.guest_total ?? 0),
    maybeResponses: Number(rsvp.maybe_count ?? 0),
    activeMedia: Number(media.active_count ?? 0),
    trashCount: Number(rsvp.trash_count ?? 0) + Number(media.trash_count ?? 0),
    invalidRecords: Number(rsvp.invalid_count ?? 0) + Number(media.invalid_count ?? 0),
    duplicatePairs: findPotentialDuplicatePairs(results[4].results).length,
    albumConfigured: typeof settings.album_url === "string" && settings.album_url.length > 0,
    lastSubmissionAt,
    lastBackupAt,
    backup: backupHealth(lastBackupAt, now),
    failedLogins24h: Number(security.failed_logins_24h ?? 0),
    checklist: parseChecklist(settings.operations_checklist),
  };
}

export async function saveOperationsChecklist(db, checklist, now = new Date().toISOString()) {
  const normalized = Object.fromEntries(MANUAL_CHECKLIST_KEYS.map((key) => [key, checklist?.[key] === true]));
  const value = JSON.stringify(normalized);
  await db.batch([
    db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
      .bind("operations_checklist", value, now),
    db.prepare("INSERT INTO security_events (id, event_type, fingerprint, created_at) VALUES (?, ?, ?, ?)")
      .bind(crypto.randomUUID(), "admin_operations_checklist_updated", "admin", now),
  ]);
  return normalized;
}
