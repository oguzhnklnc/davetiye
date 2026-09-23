const definitions = {
  rsvp: { table: "rsvps", columns: ["name", "status", "guest_count", "note"], event: "rsvp_submitted", limit: 5, networkLimit: 1000 },
  memory: { table: "media_links", columns: ["name", "url"], event: "memory_submitted", limit: 10, networkLimit: 2000 },
};

/** D1 batches are transactions: the record and its limit event commit together. */
export async function saveSubmission(db, { type, id, values, fingerprint, networkFingerprint, now = new Date().toISOString() }) {
  const definition = definitions[type];
  if (!definition) throw new Error("Unknown submission type");
  if (!fingerprint || !networkFingerprint) throw new Error("Submission identity is missing");
  const { table, columns, event, limit, networkLimit } = definition;
  const cutoff = new Date(Date.parse(now) - 3600000).toISOString();
  const results = await db.batch([
    db.prepare(`INSERT INTO ${table} (id, ${columns.join(", ")}, created_at)
      SELECT ${[id, ...values, now].map(() => "?").join(", ")}
      WHERE (SELECT COUNT(*) FROM security_events WHERE event_type = ? AND fingerprint = ? AND created_at >= ?) < ?
      AND (SELECT COUNT(*) FROM security_events WHERE event_type = ? AND fingerprint = ? AND created_at >= ?) < ?
      ON CONFLICT(id) DO NOTHING`).bind(id, ...values, now, `${event}_browser`, fingerprint, cutoff, limit, event, networkFingerprint, cutoff, networkLimit),
    db.prepare(`INSERT INTO security_events (id, event_type, fingerprint, created_at)
      SELECT ?, ?, ?, ? WHERE changes() = 1`).bind(crypto.randomUUID(), `${event}_browser`, fingerprint, now),
    db.prepare(`INSERT INTO security_events (id, event_type, fingerprint, created_at)
      SELECT ?, ?, ?, ? WHERE changes() = 1`).bind(crypto.randomUUID(), event, networkFingerprint, now),
    db.prepare(`SELECT ${columns.join(", ")} FROM ${table} WHERE id = ?`).bind(id),
    db.prepare("DELETE FROM security_events WHERE created_at < ?").bind(new Date(Date.parse(now) - 30 * 86400000).toISOString()),
  ]);
  const row = results[3].results[0];
  if (!row) return "limited";
  if (columns.some((column, index) => row[column] !== values[index])) return "conflict";
  return results[0].meta.changes === 1 ? "created" : "duplicate";
}

export async function submissionRetryAfter(db, { type, fingerprint, networkFingerprint, now = Date.now() }) {
  const { event, limit, networkLimit } = definitions[type];
  const cutoff = new Date(now - 3600000).toISOString();
  const limits = [[`${event}_browser`, fingerprint, limit], [event, networkFingerprint, networkLimit]];
  const results = await db.batch(limits.map(([eventType, visitor]) => db.prepare(
    "SELECT COUNT(*) AS count, MIN(created_at) AS oldest FROM security_events WHERE event_type = ? AND fingerprint = ? AND created_at >= ?",
  ).bind(eventType, visitor, cutoff)));
  return Math.max(1, ...results.map((result, index) => {
    const row = result.results[0];
    return row && row.count >= limits[index][2] ? Math.ceil((Date.parse(row.oldest) + 3600000 - now) / 1000) : 0;
  }));
}
