import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRateLimit, isSameOriginRequest } from "../app/security-policy.mjs";

test("yalnızca aynı kaynaktan gelen değişiklik isteklerini kabul eder", () => {
  assert.equal(isSameOriginRequest(new Request("https://davetiye.test/api/admin/login", { headers: { Origin: "https://davetiye.test" } })), true);
  assert.equal(isSameOriginRequest(new Request("https://davetiye.test/api/admin/login", { headers: { Origin: "https://evil.example" } })), false);
  assert.equal(isSameOriginRequest(new Request("https://davetiye.test/api/admin/login")), false);
});

test("beşinci güvenlik olayından sonra 3 dakikalık sınırı uygular", () => {
  const now = Date.parse("2026-08-17T12:02:00.000Z");
  const oldest = "2026-08-17T12:00:00.000Z";
  assert.deepEqual(evaluateRateLimit({ count: 4, oldest, now, limit: 5, windowSeconds: 180 }), { allowed: true, retryAfter: 0, count: 4 });
  assert.deepEqual(evaluateRateLimit({ count: 5, oldest, now, limit: 5, windowSeconds: 180 }), { allowed: false, retryAfter: 60, count: 5 });
});
