import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Miniflare } from "miniflare";
import { decryptBackup, encryptBackup } from "../app/backup-crypto.mjs";
import { BACKUP_SITE, backupSummary, validateBackup } from "../app/backup-format.mjs";
import { exportBackup, restoreBackup } from "../db/backup.mjs";
import { changeTrashState } from "../db/trash.mjs";

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

function sample() {
  return validateBackup({ format: "davetiye-backup", version: 1, site: BACKUP_SITE, exported_at: "2026-09-20T12:00:00.000Z",
    rsvps: [{ id: "12345678-1234-4123-8123-123456789abc", name: "Test Davetli", status: "attending", guest_count: 2, note: "", created_at: "2026-09-20T11:00:00.000Z", deleted_at: null }],
    media_links: [{ id: "22345678-1234-4123-8123-123456789abc", name: "Test Davetli", url: "https://drive.google.com/example", created_at: "2026-09-20T11:05:00.000Z", deleted_at: "2026-09-20T11:10:00.000Z" }],
    settings: [{ key: "album_url", value: "https://photos.google.com/example", updated_at: "2026-09-20T11:15:00.000Z" }] });
}

test("tam yedek şifrelenir; doğru parolayla açılır, yanlış parola ve değişiklik reddedilir", async () => {
  const backup = sample();
  const encrypted = await encryptBackup(backup, "çok-güçlü-yedek-parolası");
  assert.deepEqual(await decryptBackup(encrypted, "çok-güçlü-yedek-parolası"), backup);
  await assert.rejects(decryptBackup(encrypted, "yanlış-bir-parola"), /Parola yanlış/);
  const envelope = JSON.parse(encrypted);
  envelope.ciphertext = envelope.ciphertext.slice(0, -2) + "AA";
  await assert.rejects(decryptBackup(JSON.stringify(envelope), "çok-güçlü-yedek-parolası"), /dosya bozulmuş/);
  await assert.rejects(encryptBackup(backup, "kısa"), /12–256/);
  assert.deepEqual(backupSummary(backup), { rsvps: 1, media: 1, settings: 1, trash: 1 });
});

test("başka siteye ait veya zararlı içerikli yedek reddedilir", () => {
  const backup = sample();
  assert.throws(() => validateBackup({ ...backup, site: "other" }), /geçersiz/);
  assert.throws(() => validateBackup({ ...backup, media_links: [{ ...backup.media_links[0], url: "https://evil.example/a" }] }), /geçersiz/);
  assert.throws(() => validateBackup({ ...backup, rsvps: [backup.rsvps[0], backup.rsvps[0]] }), /geçersiz/);
  assert.throws(() => validateBackup({ ...backup, rsvps: [{ ...backup.rsvps[0], guest_count: 0 }] }), /geçersiz/);
});

test("yedek dışa aktarma ve geri yükleme kayıpsız ve tekrar çalıştırılabilir", async (t) => {
  const source = await database(t);
  const backup = sample();
  assert.deepEqual(await restoreBackup(source, backup), { rsvps: 1, media: 1, settings: 1 });
  assert.deepEqual(await restoreBackup(source, backup), { rsvps: 0, media: 0, settings: 0 });
  const exported = await exportBackup(source);
  assert.deepEqual({ ...exported, exported_at: backup.exported_at }, backup);

  const target = await database(t);
  await target.prepare("INSERT INTO rsvps (id, name, status, guest_count, note, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(backup.rsvps[0].id, "Mevcut Kayıt", "maybe", 0, "koru", "2026-09-19T00:00:00.000Z", null).run();
  assert.deepEqual(await restoreBackup(target, backup), { rsvps: 0, media: 1, settings: 1 });
  assert.equal(await target.prepare("SELECT name FROM rsvps WHERE id = ?").bind(backup.rsvps[0].id).first("name"), "Mevcut Kayıt");
});

test("silinen kayıt çöp kutusuna taşınır ve geri alınabilir", async (t) => {
  const db = await database(t);
  const backup = sample();
  await restoreBackup(db, backup);
  const id = backup.rsvps[0].id;
  assert.equal(await changeTrashState(db, { type: "rsvp", id, now: "2026-09-20T13:00:00.000Z" }), 1);
  assert.equal(await changeTrashState(db, { type: "rsvp", id, now: "2026-09-20T13:01:00.000Z" }), 0);
  assert.equal(await db.prepare("SELECT deleted_at FROM rsvps WHERE id = ?").bind(id).first("deleted_at"), "2026-09-20T13:00:00.000Z");
  assert.equal(await changeTrashState(db, { type: "rsvp", id, restore: true, now: "2026-09-20T13:02:00.000Z" }), 1);
  assert.equal(await db.prepare("SELECT deleted_at FROM rsvps WHERE id = ?").bind(id).first("deleted_at"), null);
  assert.equal(await db.prepare("SELECT COUNT(*) AS n FROM security_events WHERE event_type LIKE 'admin_%'").first("n"), 2);
});

test("geri yükleme veya işlem kaydı hata verirse tüm değişiklik geri alınır", async (t) => {
  const db = await database(t);
  const backup = sample();
  await db.prepare("CREATE TRIGGER fail_media BEFORE INSERT ON media_links BEGIN SELECT RAISE(ABORT, 'restore failure'); END").run();
  await assert.rejects(restoreBackup(db, backup), /restore failure/);
  assert.equal(await db.prepare("SELECT COUNT(*) AS n FROM rsvps").first("n"), 0);
  assert.equal(await db.prepare("SELECT COUNT(*) AS n FROM settings").first("n"), 0);
  await db.prepare("DROP TRIGGER fail_media").run();
  await restoreBackup(db, backup);
  await db.prepare("CREATE TRIGGER fail_audit BEFORE INSERT ON security_events BEGIN SELECT RAISE(ABORT, 'audit failure'); END").run();
  await assert.rejects(changeTrashState(db, { type: "rsvp", id: backup.rsvps[0].id }), /audit failure/);
  assert.equal(await db.prepare("SELECT deleted_at FROM rsvps WHERE id = ?").bind(backup.rsvps[0].id).first("deleted_at"), null);
});
