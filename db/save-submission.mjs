const definitions = {
  rsvp: { table: "rsvps", columns: ["name", "status", "guest_count", "note"], event: "rsvp_submitted", limit: 5 },
  memory: { table: "media_links", columns: ["name", "url"], event: "memory_submitted", limit: 10 },
};

/** D1 batches are transactions: the record and its limit event commit together. */
export async function saveSubmission(db, { type, id, values, fingerprint, now = new Date().toISOString() }) {
  const definition = definitions[type];
  if (!definition) throw new Error("Unknown submission type");
  const { table, columns, event, limit } = definition;
  const cutoff = new Date(Date.parse(now) - 3600000).toISOString();
  const results = await db.batch([
    db.prepare(`INSERT INTO ${table} (id, ${columns.join(", ")}, created_at)
      SELECT ${[id, ...values, now].map(() => "?").join(", ")}
      WHERE (SELECT COUNT(*) FROM security_events WHERE event_type = ? AND fingerprint = ? AND created_at >= ?) < ?
      ON CONFLICT(id) DO NOTHING`).bind(id, ...values, now, event, fingerprint, cutoff, limit),
    db.prepare(`INSERT INTO security_events (id, event_type, fingerprint, created_at)
      SELECT ?, ?, ?, ? WHERE changes() = 1`).bind(crypto.randomUUID(), event, fingerprint, now),
    db.prepare(`SELECT ${columns.join(", ")} FROM ${table} WHERE id = ?`).bind(id),
    db.prepare("DELETE FROM security_events WHERE created_at < ?").bind(new Date(Date.parse(now) - 30 * 86400000).toISOString()),
  ]);
  const row = results[2].results[0];
  if (!row) return "limited";
  if (columns.some((column, index) => row[column] !== values[index])) return "conflict";
  return results[0].meta.changes === 1 ? "created" : "duplicate";
}
