import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Miniflare } from "miniflare";
import { mergeRsvps, updateRsvp } from "../db/rsvp-management.mjs";

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

const firstId = "12345678-1234-4123-8123-123456789abc";
const secondId = "22345678-1234-4123-8123-123456789abc";

async function seed(db) {
  await db.batch([
    db.prepare("INSERT INTO rsvps (id, name, status, guest_count, note, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(firstId, "Dilek Selver", "maybe", 0, "", "2026-09-20T10:00:00.000Z"),
    db.prepare("INSERT INTO rsvps (id, name, status, guest_count, note, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(secondId, "Dilek Selvr", "attending", 2, "Vejetaryen", "2026-09-20T11:00:00.000Z"),
  ]);
}

test("LCV kaydı güncellenir ve denetim olayı birlikte yazılır", async (t) => {
  const db = await database(t); await seed(db);
  assert.equal(await updateRsvp(db, { id: firstId, name: "Dilek Selver", status: "attending", guestCount: 3, note: "Pencere kenarı", now: "2026-09-20T12:00:00.000Z" }), 1);
  assert.deepEqual(await db.prepare("SELECT name, status, guest_count, note FROM rsvps WHERE id = ?").bind(firstId).first(), { name: "Dilek Selver", status: "attending", guest_count: 3, note: "Pencere kenarı" });
  assert.equal(await db.prepare("SELECT COUNT(*) AS n FROM security_events WHERE event_type = 'admin_rsvp_updated'").first("n"), 1);
});

test("mükerrer kayıt seçilen kayıt korunarak çöp kutusuna taşınır", async (t) => {
  const db = await database(t); await seed(db);
  assert.equal(await mergeRsvps(db, { keepId: secondId, removeId: firstId, now: "2026-09-20T12:30:00.000Z" }), 1);
  assert.equal(await db.prepare("SELECT deleted_at FROM rsvps WHERE id = ?").bind(firstId).first("deleted_at"), "2026-09-20T12:30:00.000Z");
  assert.equal(await db.prepare("SELECT deleted_at FROM rsvps WHERE id = ?").bind(secondId).first("deleted_at"), null);
  assert.equal(await db.prepare("SELECT COUNT(*) AS n FROM security_events WHERE event_type = 'admin_rsvp_merged'").first("n"), 1);
});

test("eksik, silinmiş veya aynı kayıt birleştirilemez", async (t) => {
  const db = await database(t); await seed(db);
  await assert.rejects(mergeRsvps(db, { keepId: firstId, removeId: firstId }), /Geçersiz/);
  await db.prepare("UPDATE rsvps SET deleted_at = ? WHERE id = ?").bind("2026-09-20T13:00:00.000Z", secondId).run();
  assert.equal(await mergeRsvps(db, { keepId: secondId, removeId: firstId }), 0);
  assert.equal(await db.prepare("SELECT deleted_at FROM rsvps WHERE id = ?").bind(firstId).first("deleted_at"), null);
});

test("denetim kaydı başarısızsa LCV değişikliği geri alınır", async (t) => {
  const db = await database(t); await seed(db);
  await db.prepare("CREATE TRIGGER fail_admin_audit BEFORE INSERT ON security_events BEGIN SELECT RAISE(ABORT, 'audit failure'); END").run();
  await assert.rejects(updateRsvp(db, { id: firstId, name: "Değişti", status: "declined", guestCount: 0, note: "" }), /audit failure/);
  assert.equal(await db.prepare("SELECT name FROM rsvps WHERE id = ?").bind(firstId).first("name"), "Dilek Selver");
});
