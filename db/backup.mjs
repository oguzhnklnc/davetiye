import { BACKUP_SITE, validateBackup } from "../app/backup-format.mjs";

const tables = {
  rsvps: ["id", "name", "status", "guest_count", "note", "created_at", "deleted_at"],
  media_links: ["id", "name", "url", "created_at", "deleted_at"],
  settings: ["key", "value", "updated_at"],
};

export async function exportBackup(db) {
  // A single read transaction gives all sections the same database snapshot.
  const results = await db.batch(Object.entries(tables).map(([table, columns]) => db.prepare(`SELECT ${columns.join(", ")} FROM ${table}${table === "settings" ? " WHERE key IN ('album_url', 'operations_checklist')" : ""} ORDER BY ${columns[0]}`)));
  return validateBackup({ format: "davetiye-backup", version: 1, site: BACKUP_SITE, exported_at: new Date().toISOString(),
    ...Object.fromEntries(Object.keys(tables).map((table, index) => [table, results[index].results])) });
}

export async function restoreBackup(db, input) {
  const backup = validateBackup(input);
  // Parameterized JSON imports keep the entire restore in three D1 statements.
  // Existing rows (including trash) always win, so a retry is harmless.
  const results = await db.batch(Object.entries(tables).map(([table, columns]) => db.prepare(
    `INSERT INTO ${table} (${columns.join(", ")})
     SELECT ${columns.map((column) => `json_extract(value, '$.${column}')`).join(", ")}
     FROM json_each(?) WHERE 1 ON CONFLICT(${columns[0]}) DO NOTHING`,
  ).bind(JSON.stringify(backup[table]))));
  return { rsvps: Number(results[0].meta.changes), media: Number(results[1].meta.changes), settings: Number(results[2].meta.changes) };
}
