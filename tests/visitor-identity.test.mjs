import assert from "node:assert/strict";
import test from "node:test";
import { getVisitorIdentity } from "../app/visitor-identity.mjs";

const secret = "test-only-visitor-signing-key";
const now = 1790000000;
const request = (cookie = "", ip = "192.0.2.1") => new Request("https://invitation.test/api/rsvp", { headers: { cookie, "cf-connecting-ip": ip } });
const cookieOf = (identity) => identity.respond(Response.json({ ok: true })).headers.get("set-cookie");

test("aynı Wi-Fi üzerindeki farklı tarayıcıların kimlikleri ayrıdır", async () => {
  const a = await getVisitorIdentity(request(), secret, { now });
  const b = await getVisitorIdentity(request(), secret, { now });
  assert.notEqual(a.fingerprint, b.fingerprint);
  assert.equal(a.networkFingerprint, b.networkFingerprint);
  assert.doesNotMatch(a.networkFingerprint, /192\.0\.2/);
});

test("yenileme ve ağ değişikliği tarayıcı kimliğini değiştirmez", async () => {
  const original = await getVisitorIdentity(request(), secret, { now });
  const cookie = cookieOf(original).split(";")[0];
  const renewed = await getVisitorIdentity(request(cookie, "192.0.2.2"), secret, { now: now + 10 });
  assert.equal(original.fingerprint, renewed.fingerprint);
  assert.notEqual(original.networkFingerprint, renewed.networkFingerprint);
  assert.equal(cookieOf(renewed), null);
});

test("ziyaretçi çerezi güvenli ve kişisel bilgi içermez", async () => {
  const visitor = await getVisitorIdentity(request(), secret, { now });
  const response = visitor.respond(Response.json({ ok: true }));
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /^__Host-davetiye_visitor=/);
  for (const flag of ["HttpOnly", "Secure", "SameSite=Strict", "Path=/", "Max-Age=604800"]) assert.ok(cookie.includes(flag));
  assert.doesNotMatch(cookie, /192\.0\.2|Domain=/);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("değiştirilmiş, süresi dolmuş veya başka anahtarla imzalanmış kimlik kabul edilmez", async () => {
  const original = await getVisitorIdentity(request(), secret, { now });
  const cookie = cookieOf(original).split(";")[0];
  const changed = cookie.slice(0, -1) + (cookie.endsWith("0") ? "1" : "0");
  const visitors = [
    await getVisitorIdentity(request(changed), secret, { now }),
    await getVisitorIdentity(request(cookie), secret, { now: now + 604801 }),
    await getVisitorIdentity(request(cookie), "new-key", { now }),
  ];
  for (const visitor of visitors) {
    assert.notEqual(visitor.fingerprint, original.fingerprint);
    assert.ok(cookieOf(visitor));
  }
});

test("kullanıcının yönlendirme başlıkları ağ sınırını değiştiremez", async () => {
  const a = await getVisitorIdentity(new Request("https://invitation.test", { headers: { "x-forwarded-for": "192.0.2.1" } }), secret, { now });
  const b = await getVisitorIdentity(new Request("https://invitation.test", { headers: { "x-forwarded-for": "192.0.2.2" } }), secret, { now });
  assert.equal(a.networkFingerprint, b.networkFingerprint);
  await assert.rejects(getVisitorIdentity(request(), "", { now }), /secret is missing/);
});
