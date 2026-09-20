import assert from "node:assert/strict";
import test from "node:test";
import { RequestBodyError, readJsonBody } from "../app/request-body.mjs";

function request(body, headers = {}) {
  return new Request("https://davetiye.test/api", { method: "POST", body, headers: { "Content-Type": "application/json", ...headers } });
}

test("boyutu uygun JSON nesnesi okunur", async () => {
  assert.deepEqual(await readJsonBody(request(JSON.stringify({ name: "Özdil" })), 1_024), { name: "Özdil" });
});

test("ilan edilen veya gerçek gövde sınırı aşılırsa 413 döner", async () => {
  await assert.rejects(readJsonBody(request("{}", { "Content-Length": "4097" }), 4_096), (error) => error instanceof RequestBodyError && error.status === 413);
  await assert.rejects(readJsonBody(request(JSON.stringify({ note: "x".repeat(200) })), 64), (error) => error instanceof RequestBodyError && error.status === 413);
});

test("bozuk JSON, dizi ve yanlış içerik türü reddedilir", async () => {
  await assert.rejects(readJsonBody(request("{"), 1_024), (error) => error.status === 400);
  await assert.rejects(readJsonBody(request("[]"), 1_024), (error) => error.status === 400);
  await assert.rejects(readJsonBody(request("{}", { "Content-Type": "text/plain" }), 1_024), (error) => error.status === 415);
});
