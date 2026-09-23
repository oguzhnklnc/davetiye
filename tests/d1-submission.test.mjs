import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Miniflare } from "miniflare";
import { saveSubmission, submissionRetryAfter } from "../db/save-submission.mjs";

test("D1 çalışma ortamında eşzamanlı gönderim, sınır ve işlem geri alma", async (t) => {
  const runtime = new Miniflare({ modules: true, script: "export default { fetch() { return new Response('test'); } };", compatibilityDate: "2026-05-22", d1Databases: ["DB"] });
  t.after(() => runtime.dispose());
  const db = await runtime.getD1Database("DB");
  for (const file of ["0000_previous_wrecking_crew.sql", "0001_known_crusher_hogan.sql", "0002_short_kang.sql"]) {
    const statements = readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8").split(";").map((sql) => sql.replaceAll("--> statement-breakpoint", "").trim()).filter(Boolean);
    await db.batch(statements.map((sql) => db.prepare(sql)));
  }
  const input = { type: "rsvp", id: crypto.randomUUID(), values: ["Test", "attending", 2, ""], fingerprint: "test", networkFingerprint: "shared-network" };
  const duplicates = await Promise.all(Array.from({ length: 8 }, () => saveSubmission(db, input)));
  assert.equal(duplicates.filter((value) => value === "created").length, 1);
  assert.equal(duplicates.filter((value) => value === "duplicate").length, 7);
  const requests = await Promise.all(Array.from({ length: 10 }, () => saveSubmission(db, { ...input, id: crypto.randomUUID() })));
  assert.equal(requests.filter((value) => value === "created").length, 4);
  assert.equal(await db.prepare("SELECT COUNT(*) AS n FROM security_events").first("n"), 10);
  assert.equal(await saveSubmission(db, input), "duplicate");
  assert.equal(await saveSubmission(db, { ...input, values: ["Other", "attending", 2, ""] }), "conflict");
  await db.prepare("CREATE TRIGGER fail_event BEFORE INSERT ON security_events BEGIN SELECT RAISE(ABORT, 'test failure'); END").run();
  await assert.rejects(saveSubmission(db, { ...input, id: crypto.randomUUID(), fingerprint: "other" }), /test failure/);
  assert.equal(await db.prepare("SELECT COUNT(*) AS n FROM rsvps").first("n"), 5);
  await db.prepare("DROP TRIGGER fail_event").run();

  await t.test("aynı ağdan 300 tarayıcı ayrı ayrı LCV gönderebilir", async () => {
    const guests = await Promise.all(Array.from({ length: 300 }, (_, index) => saveSubmission(db, {
      ...input, id: crypto.randomUUID(), fingerprint: `guest-${index}`, networkFingerprint: "venue",
    })));
    assert.ok(guests.every((result) => result === "created"));
    const regular = { ...input, fingerprint: "guest-0", networkFingerprint: "venue" };
    for (let i = 0; i < 4; i++) assert.equal(await saveSubmission(db, { ...regular, id: crypto.randomUUID() }), "created");
    assert.equal(await saveSubmission(db, { ...regular, id: crypto.randomUUID() }), "limited");
    assert.equal(await saveSubmission(db, { ...regular, id: crypto.randomUUID(), fingerprint: "new-guest" }), "created");
  });

  await t.test("ağ üst sınırı yeni kimliklerle aşılamaz ve tekrarlar hakkı tüketmez", async () => {
    const timestamp = "2026-09-20T12:00:00.000Z";
    await db.prepare(`WITH RECURSIVE counter(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM counter WHERE n < 999)
      INSERT INTO security_events (id, event_type, fingerprint, created_at)
      SELECT 'network-seed-' || n, 'rsvp_submitted', 'busy-network', ? FROM counter`).bind(timestamp).run();
    const candidates = Array.from({ length: 8 }, (_, index) => ({ ...input, id: crypto.randomUUID(), fingerprint: `last-guest-${index}`, networkFingerprint: "busy-network", now: timestamp }));
    const results = await Promise.all(candidates.map((candidate) => saveSubmission(db, candidate)));
    assert.equal(results.filter((result) => result === "created").length, 1);
    const candidate = candidates[results.indexOf("created")];
    assert.equal(await saveSubmission(db, candidate), "duplicate");
    assert.equal(await saveSubmission(db, { ...candidate, id: crypto.randomUUID(), fingerprint: "cookie-reset" }), "limited");
    assert.equal(await submissionRetryAfter(db, { type: "rsvp", fingerprint: "cookie-reset", networkFingerprint: "busy-network", now: Date.parse(timestamp) + 600000 }), 3000);
    assert.equal(await saveSubmission(db, { ...candidate, id: crypto.randomUUID(), now: "2026-09-20T13:01:00.000Z" }), "created");
  });
});
