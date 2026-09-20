import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { saveSubmission } from "../db/save-submission.mjs";

function database(t) {
  const sqlite = new DatabaseSync(":memory:");
  t.after(() => sqlite.close());
  // Use the actual deployed migration schema, not a second test-only schema.
  for (const file of ["0000_previous_wrecking_crew.sql", "0001_known_crusher_hogan.sql", "0002_short_kang.sql"])
    sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  const db = {
    prepare(sql) { return { bind(...params) { return { sql, params }; } }; },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = statements.map(({ sql, params }) => {
          const query = sqlite.prepare(sql);
          if (/^SELECT/.test(sql)) return { results: query.all(...params), meta: {} };
          const result = query.run(...params);
          return { results: [], meta: { changes: Number(result.changes) } };
        });
        sqlite.exec("COMMIT");
        return results;
      } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  return { sqlite, db };
}

for (const type of ["rsvp", "memory"]) {
  const values = type === "rsvp" ? ["Test Davetli", "attending", 2, ""] : ["Test Davetli", "https://drive.google.com/test"];
  const table = type === "rsvp" ? "rsvps" : "media_links";
  const payload = () => ({ type, id: crypto.randomUUID(), values, fingerprint: "test", networkFingerprint: "shared-network", now: "2026-09-20T12:00:00.000Z" });

  test(`${type}: paralel tekrarlar tek kayıt ve her sınır için bir güvenlik olayı oluşturur`, async (t) => {
    const { db, sqlite } = database(t);
    const input = payload();
    const outcomes = await Promise.all(Array.from({ length: 8 }, () => saveSubmission(db, input)));
    assert.equal(outcomes.filter((value) => value === "created").length, 1);
    assert.equal(outcomes.filter((value) => value === "duplicate").length, 7);
    assert.equal(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 1);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM security_events").get().n, 2);
    assert.equal(await saveSubmission(db, { ...input, values: ["Changed", ...values.slice(1)] }), "conflict");
  });

  test(`${type}: kayıt ve güvenlik olayı birlikte geri alınır`, async (t) => {
    const { db, sqlite } = database(t);
    sqlite.exec("CREATE TRIGGER fail_event BEFORE INSERT ON security_events BEGIN SELECT RAISE(ABORT, 'test failure'); END");
    const input = payload();
    await assert.rejects(saveSubmission(db, input), /test failure/);
    assert.equal(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0);
    sqlite.exec("DROP TRIGGER fail_event");
    assert.equal(await saveSubmission(db, input), "created");
  });

  test(`${type}: sınır aşılamaz, mevcut kaydın tekrarı yine başarılıdır`, async (t) => {
    const { db, sqlite } = database(t);
    const input = payload();
    await saveSubmission(db, input);
    const limit = type === "rsvp" ? 5 : 10;
    const outcomes = await Promise.all(Array.from({ length: limit + 5 }, () => saveSubmission(db, payload())));
    assert.equal(outcomes.filter((value) => value === "created").length, limit - 1);
    assert.equal(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, limit);
    assert.equal(await saveSubmission(db, input), "duplicate");
    assert.equal(await saveSubmission(db, { ...payload(), now: "2026-09-20T13:01:00.000Z" }), "created");
  });
}
