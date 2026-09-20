import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Miniflare } from "miniflare";
import { createAdminSessionToken, verifyAdminSessionToken } from "../app/admin-session.mjs";
import { getAdminSessionVersion, revokeAdminSessions } from "../db/admin-session.mjs";

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

test("yönetici oturumu imza, süre ve sürümle doğrulanır", async () => {
  const values = { username: "admin", secret: "çok-uzun-bir-test-sırrı", version: "v1", now: 1_000, ttlSeconds: 300 };
  const token = await createAdminSessionToken(values);
  assert.equal(await verifyAdminSessionToken({ ...values, token, now: 1_100 }), true);
  assert.equal(await verifyAdminSessionToken({ ...values, token, version: "v2", now: 1_100 }), false);
  assert.equal(await verifyAdminSessionToken({ ...values, token, secret: "başka-sır", now: 1_100 }), false);
  assert.equal(await verifyAdminSessionToken({ ...values, token: `${token}x`, now: 1_100 }), false);
  assert.equal(await verifyAdminSessionToken({ ...values, token, now: 1_300 }), false);
});

test("tüm oturumları kapatma sürümü değiştirir ve güvenlik kaydı yazar", async (t) => {
  const db = await database(t);
  assert.equal(await getAdminSessionVersion(db), "initial");
  const version = await revokeAdminSessions(db, "2026-09-20T16:00:00.000Z");
  assert.notEqual(version, "initial");
  assert.equal(await getAdminSessionVersion(db), version);
  const event = await db.prepare("SELECT event_type, fingerprint, created_at FROM security_events WHERE event_type = ?").bind("admin_sessions_revoked").first();
  assert.deepEqual(event, { event_type: "admin_sessions_revoked", fingerprint: "admin", created_at: "2026-09-20T16:00:00.000Z" });
});

test("oturum sürümü ile denetim kaydı birlikte başarısız olur", async (t) => {
  const db = await database(t);
  await db.prepare("CREATE TRIGGER fail_revoke_audit BEFORE INSERT ON security_events BEGIN SELECT RAISE(ABORT, 'audit failure'); END").run();
  await assert.rejects(revokeAdminSessions(db), /audit failure/);
  assert.equal(await getAdminSessionVersion(db), "initial");
});
