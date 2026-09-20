import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Miniflare } from "miniflare";
import { saveSubmission } from "../db/save-submission.mjs";

test("D1 çalışma ortamında eşzamanlı gönderim, sınır ve işlem geri alma", async (t) => {
  const runtime = new Miniflare({ modules: true, script: "export default { fetch() { return new Response('test'); } };", compatibilityDate: "2026-05-22", d1Databases: ["DB"] });
  t.after(() => runtime.dispose());
  const db = await runtime.getD1Database("DB");
  for (const file of ["0000_previous_wrecking_crew.sql", "0001_known_crusher_hogan.sql", "0002_short_kang.sql"]) {
    const statements = readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8").split(";").map((sql) => sql.replaceAll("--> statement-breakpoint", "").trim()).filter(Boolean);
    await db.batch(statements.map((sql) => db.prepare(sql)));
  }
  const input = { type: "rsvp", id: crypto.randomUUID(), values: ["Test", "attending", 2, ""], fingerprint: "test" };
  const duplicates = await Promise.all(Array.from({ length: 8 }, () => saveSubmission(db, input)));
  assert.equal(duplicates.filter((value) => value === "created").length, 1);
  assert.equal(duplicates.filter((value) => value === "duplicate").length, 7);
  const requests = await Promise.all(Array.from({ length: 10 }, () => saveSubmission(db, { ...input, id: crypto.randomUUID() })));
  assert.equal(requests.filter((value) => value === "created").length, 4);
  assert.equal(await db.prepare("SELECT COUNT(*) AS n FROM security_events").first("n"), 5);
  assert.equal(await saveSubmission(db, input), "duplicate");
  assert.equal(await saveSubmission(db, { ...input, values: ["Other", "attending", 2, ""] }), "conflict");
  await db.prepare("CREATE TRIGGER fail_event BEFORE INSERT ON security_events BEGIN SELECT RAISE(ABORT, 'test failure'); END").run();
  await assert.rejects(saveSubmission(db, { ...input, id: crypto.randomUUID(), fingerprint: "other" }), /test failure/);
  assert.equal(await db.prepare("SELECT COUNT(*) AS n FROM rsvps").first("n"), 5);
});
