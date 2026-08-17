import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("davetiyeyi sunucu tarafında doğru içerikle oluşturur", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Özdil/);
  assert.match(html, /Hüseyin/);
  assert.match(html, /24 Ekim 2026/);
  assert.match(html, /Barida Hotel/);
  assert.match(html, /Düğün Davetiyesi/);
  assert.match(html, /yalnızca düğün organizasyonu ve katılım planlaması amacıyla kullanılacaktır/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Your site is taking shape/i);
});

test("üretim ayarlarını ve gizli değer şablonunu korur", async () => {
  const [hosting, packageJson, envExample] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);
  assert.equal(JSON.parse(hosting).d1, "DB");
  assert.equal(JSON.parse(packageJson).name, "ozdil-huseyin-davetiye");
  assert.match(envExample, /ADMIN_USERNAME=/);
  assert.match(envExample, /ADMIN_PASSWORD=/);
  assert.match(envExample, /ADMIN_AUTH_SECRET=/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
