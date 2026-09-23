import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Miniflare } from "miniflare";
import { decryptBackup, encryptBackup } from "../app/backup-crypto.mjs";
import { backupSummary } from "../app/backup-format.mjs";
import { exportBackup, restoreBackup } from "../db/backup.mjs";

const migrations = [
  "0000_previous_wrecking_crew.sql",
  "0001_known_crusher_hogan.sql",
  "0002_short_kang.sql",
  "0003_smart_talkback.sql",
];

async function createDatabase() {
  const runtime = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('recovery-drill'); } };",
    compatibilityDate: "2026-05-22",
    d1Databases: ["DB"],
  });
  const db = await runtime.getD1Database("DB");
  for (const file of migrations) {
    const sql = readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8");
    const statements = sql.split(";").map((statement) => statement.replaceAll("--> statement-breakpoint", "").trim()).filter(Boolean);
    await db.batch(statements.map((statement) => db.prepare(statement)));
  }
  return { runtime, db };
}

async function seed(db) {
  await db.batch([
    db.prepare("INSERT INTO rsvps (id, name, status, guest_count, note, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind("11111111-1111-4111-8111-111111111111", "Tatbikat Davetlisi", "attending", 3, "Glütensiz menü", "2026-09-21T09:00:00.000Z", null),
    db.prepare("INSERT INTO rsvps (id, name, status, guest_count, note, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind("22222222-2222-4222-8222-222222222222", "Silinmiş Tatbikat Kaydı", "declined", 0, "", "2026-09-21T09:05:00.000Z", "2026-09-21T09:10:00.000Z"),
    db.prepare("INSERT INTO media_links (id, name, url, created_at, deleted_at) VALUES (?, ?, ?, ?, ?)")
      .bind("33333333-3333-4333-8333-333333333333", "Tatbikat Galerisi", "https://drive.google.com/example", "2026-09-21T09:15:00.000Z", null),
    db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)")
      .bind("album_url", "https://photos.google.com/example", "2026-09-21T09:20:00.000Z"),
    db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)")
      .bind("operations_checklist", '{"maps_checked":true,"qr_checked":true,"second_device_login_checked":false}', "2026-09-21T09:25:00.000Z"),
    db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)")
      .bind("admin_session_version", "must-not-leave-source", "2026-09-21T09:30:00.000Z"),
  ]);
}

function comparable(backup) {
  return { rsvps: backup.rsvps, media_links: backup.media_links, settings: backup.settings };
}

const startedAt = Date.now();
const source = await createDatabase();
const target = await createDatabase();

try {
  await seed(source.db);
  const exported = await exportBackup(source.db);
  const password = `drill-${crypto.randomUUID()}-safe`;
  const encrypted = await encryptBackup(exported, password);
  const decrypted = await decryptBackup(encrypted, password);

  await assert.rejects(decryptBackup(encrypted, `${password}-wrong`), /Parola yanlış/);
  const damaged = JSON.parse(encrypted);
  damaged.ciphertext = `${damaged.ciphertext.slice(0, -4)}AAAA`;
  await assert.rejects(decryptBackup(JSON.stringify(damaged), password), /dosya bozulmuş/);

  const restored = await restoreBackup(target.db, decrypted);
  assert.deepEqual(restored, { rsvps: 2, media: 1, settings: 2 });
  assert.deepEqual(await restoreBackup(target.db, decrypted), { rsvps: 0, media: 0, settings: 0 });
  const recovered = await exportBackup(target.db);
  assert.deepEqual(comparable(recovered), comparable(exported));
  assert.equal(await target.db.prepare("SELECT COUNT(*) AS n FROM settings WHERE key = 'admin_session_version'").first("n"), 0);

  console.log(JSON.stringify({
    result: "passed",
    duration_ms: Date.now() - startedAt,
    summary: backupSummary(exported),
    checks: [
      "encrypted-round-trip",
      "wrong-password-rejected",
      "damaged-file-rejected",
      "isolated-restore-complete",
      "retry-idempotent",
      "private-session-setting-excluded",
    ],
  }, null, 2));
} finally {
  await Promise.all([source.runtime.dispose(), target.runtime.dispose()]);
}
