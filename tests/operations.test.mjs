import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Miniflare } from "miniflare";
import { backupHealth, checklistProgress, parseChecklist } from "../app/operations.mjs";
import { getOperationalSnapshot, saveOperationsChecklist } from "../db/operations.mjs";

async function database(t) {
  const runtime = new Miniflare({ modules: true, script: "export default { fetch() { return new Response('test'); } };", compatibilityDate: "2026-05-22", d1Databases: ["DB"] });
  t.after(() => runtime.dispose());
  const db = await runtime.getD1Database("DB");
  for (const file of ["0000_previous_wrecking_crew.sql", "0001_known_crusher_hogan.sql", "0002_short_kang.sql", "0003_smart_talkback.sql"]) {
    const statements = readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8").split(";").map((sql) => sql.replaceAll("--> statement-breakpoint", "").trim()).filter(Boolean);
    await db.batch(statements.map((sql) => db.prepare(sql)));
  }
  return db;
}

test("yedek güncelliği düğün yaklaştığında günlük olarak değerlendirilir", () => {
  assert.deepEqual(backupHealth(null, Date.parse("2026-09-20T12:00:00Z")), { status: "missing", maxAgeDays: 7 });
  assert.equal(backupHealth("2026-09-18T12:00:00Z", Date.parse("2026-09-20T12:00:00Z")).status, "current");
  assert.equal(backupHealth("2026-10-22T12:00:00Z", Date.parse("2026-10-24T12:00:00Z")).status, "attention");
  assert.equal(backupHealth("2026-10-24T06:00:00Z", Date.parse("2026-10-24T12:00:00Z")).status, "current");
});

test("bozuk kontrol listesi güvenli varsayılanlara döner", () => {
  assert.deepEqual(parseChecklist("bozuk"), { maps_checked: false, qr_checked: false, second_device_login_checked: false });
});

test("operasyon özeti, yedek ve bütünlük durumunu doğru hesaplar", async (t) => {
  const db = await database(t);
  await db.batch([
    db.prepare("INSERT INTO rsvps (id, name, status, guest_count, note, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind("12345678-1234-4123-8123-123456789abc", "Dilek Selver", "attending", 2, "", "2026-09-20T10:00:00.000Z"),
    db.prepare("INSERT INTO rsvps (id, name, status, guest_count, note, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind("22345678-1234-4123-8123-123456789abc", "Dilek Selvr", "maybe", 0, "", "2026-09-20T11:00:00.000Z"),
    db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)").bind("album_url", "https://photos.google.com/example", "2026-09-20T11:00:00.000Z"),
    db.prepare("INSERT INTO security_events (id, event_type, fingerprint, created_at) VALUES (?, ?, ?, ?)").bind("backup", "admin_backup_exported", "anon", "2026-09-19T12:00:00.000Z"),
    db.prepare("INSERT INTO security_events (id, event_type, fingerprint, created_at) VALUES (?, ?, ?, ?)").bind("login", "admin_login_failed", "anon", "2026-09-20T08:00:00.000Z"),
  ]);
  const snapshot = await getOperationalSnapshot(db, Date.parse("2026-09-20T12:00:00.000Z"));
  assert.equal(snapshot.database, "ok");
  assert.equal(snapshot.activeRsvps, 2);
  assert.equal(snapshot.guestTotal, 2);
  assert.equal(snapshot.maybeResponses, 1);
  assert.equal(snapshot.duplicatePairs, 1);
  assert.equal(snapshot.albumConfigured, true);
  assert.equal(snapshot.backup.status, "current");
  assert.equal(snapshot.failedLogins24h, 1);
  assert.equal(snapshot.invalidRecords, 0);
  assert.deepEqual(checklistProgress(snapshot), { complete: 2, total: 7 });
});

test("elle onaylanan kontrol maddeleri kalıcı ve denetlenebilir olur", async (t) => {
  const db = await database(t);
  const checklist = await saveOperationsChecklist(db, { maps_checked: true, qr_checked: true, ignored: true }, "2026-09-20T13:00:00.000Z");
  assert.deepEqual(checklist, { maps_checked: true, qr_checked: true, second_device_login_checked: false });
  const snapshot = await getOperationalSnapshot(db, Date.parse("2026-09-20T14:00:00.000Z"));
  assert.deepEqual(snapshot.checklist, checklist);
  assert.equal(await db.prepare("SELECT COUNT(*) AS n FROM security_events WHERE event_type = 'admin_operations_checklist_updated'").first("n"), 1);
});
