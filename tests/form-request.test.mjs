import assert from "node:assert/strict";
import test from "node:test";
import { createFormRequest } from "../app/form-request.mjs";

test("bağlantı kaybında kilidi açar, yeniden denemede aynı kimliği kullanır", async () => {
  const ids = [];
  const request = createFormRequest({ idempotent: true, fetchImpl: async (_, options) => {
    ids.push(JSON.parse(options.body).submissionId);
    if (ids.length === 1) throw new TypeError("offline");
    return Response.json({ ok: true });
  } });
  assert.equal((await request.submit("/api/rsvp", { name: "Test" })).ok, false);
  assert.equal(request.busy, false);
  assert.equal((await request.submit("/api/rsvp", { name: "Test" })).ok, true);
  await request.submit("/api/rsvp", { name: "Other" });
  assert.equal(ids[0], ids[1]);
  assert.notEqual(ids[1], ids[2]);
});

test("aynı anda ikinci tıklama yeni istek oluşturmaz", async () => {
  let resolve;
  let calls = 0;
  const request = createFormRequest({ fetchImpl: () => {
    calls++;
    return new Promise((done) => { resolve = done; });
  } });
  const pending = request.submit("/api/admin/login", {});
  assert.equal(await request.submit("/api/admin/login", {}), null);
  resolve(Response.json({ ok: true }));
  await pending;
  assert.equal(calls, 1);
  assert.equal(request.busy, false);
});

test("zaman aşımında isteği iptal eder ve tekrar denemeye izin verir", async () => {
  let signal;
  const request = createFormRequest({ timeoutMs: 10, fetchImpl: (_, options) => {
    signal = options.signal;
    return new Promise(() => {});
  } });
  assert.equal((await request.submit("/api/rsvp", {})).ok, false);
  assert.equal(signal.aborted, true);
  assert.equal(request.busy, false);
});

test("bozuk yanıt ve sunucu hatasını başarı olarak göstermez", async () => {
  for (const response of [new Response("not json"), Response.json({}), Response.json({ ok: true }, { status: 500 })]) {
    const request = createFormRequest({ fetchImpl: async () => response });
    assert.equal((await request.submit("/api/rsvp", {})).ok, false);
    assert.equal(request.busy, false);
  }
});

test("istek sınırında sunucunun bekleme süresini gösterir", async () => {
  const request = createFormRequest({ fetchImpl: async () => Response.json({ error: "Limit" }, { status: 429, headers: { "Retry-After": "125" } }) });
  const result = await request.submit("/api/rsvp", {});
  assert.equal(result.ok, false);
  assert.match(result.error, /3 dakika/);
});
