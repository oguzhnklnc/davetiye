const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function updateRsvp(db, { id, name, status, guestCount, note, now = new Date().toISOString() }) {
  if (!uuidPattern.test(id)) throw new Error("Geçersiz kayıt.");
  const results = await db.batch([
    db.prepare("UPDATE rsvps SET name = ?, status = ?, guest_count = ?, note = ? WHERE id = ? AND deleted_at IS NULL")
      .bind(name, status, guestCount, note, id),
    db.prepare(`INSERT INTO security_events (id, event_type, fingerprint, created_at)
      SELECT ?, ?, ?, ? WHERE changes() = 1`).bind(crypto.randomUUID(), "admin_rsvp_updated", id, now),
  ]);
  return Number(results[0].meta.changes);
}

export async function mergeRsvps(db, { keepId, removeId, now = new Date().toISOString() }) {
  if (!uuidPattern.test(keepId) || !uuidPattern.test(removeId) || keepId === removeId) throw new Error("Geçersiz kayıt.");
  const results = await db.batch([
    db.prepare(`UPDATE rsvps SET deleted_at = ?
      WHERE id = ? AND deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM rsvps WHERE id = ? AND deleted_at IS NULL)`)
      .bind(now, removeId, keepId),
    db.prepare(`INSERT INTO security_events (id, event_type, fingerprint, created_at)
      SELECT ?, ?, ?, ? WHERE changes() = 1`).bind(crypto.randomUUID(), "admin_rsvp_merged", `${removeId}>${keepId}`, now),
  ]);
  return Number(results[0].meta.changes);
}
