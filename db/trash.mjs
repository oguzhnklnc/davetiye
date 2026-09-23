export async function changeTrashState(db, { type, id, restore = false, now = new Date().toISOString() }) {
  const table = type === "rsvp" ? "rsvps" : type === "memory" ? "media_links" : null;
  if (!table || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Geçersiz kayıt.");
  const results = await db.batch([
    db.prepare(`UPDATE ${table} SET deleted_at = ? WHERE id = ? AND deleted_at IS ${restore ? "NOT " : ""}NULL`).bind(restore ? null : now, id),
    db.prepare(`INSERT INTO security_events (id, event_type, fingerprint, created_at)
      SELECT ?, ?, ?, ? WHERE changes() = 1`).bind(crypto.randomUUID(), `admin_${restore ? "restored" : "trashed"}_${type}`, id, now),
  ]);
  return Number(results[0].meta.changes);
}

export async function permanentlyDeleteTrashRecord(db, { type, id, now = new Date().toISOString() }) {
  const table = type === "rsvp" ? "rsvps" : type === "memory" ? "media_links" : null;
  if (!table || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Geçersiz kayıt.");
  const results = await db.batch([
    db.prepare(`DELETE FROM ${table} WHERE id = ? AND deleted_at IS NOT NULL`).bind(id),
    db.prepare(`INSERT INTO security_events (id, event_type, fingerprint, created_at)
      SELECT ?, ?, ?, ? WHERE changes() = 1`).bind(crypto.randomUUID(), `admin_permanently_deleted_${type}`, id, now),
  ]);
  return Number(results[0].meta.changes);
}
