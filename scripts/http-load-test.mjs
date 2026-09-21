import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { Miniflare } from "miniflare";

const migrations = [
  "0000_previous_wrecking_crew.sql",
  "0001_known_crusher_hogan.sql",
  "0002_short_kang.sql",
  "0003_smart_talkback.sql",
];
const origin = "http://load-test.local";
const concurrency = 50;

function percentile(values, percentage) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentage) - 1)] ?? 0;
}

async function runPool(tasks, limit) {
  const results = new Array(tasks.length);
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor++;
      const startedAt = performance.now();
      try {
        const response = await tasks[index]();
        const body = await response.arrayBuffer();
        results[index] = { status: response.status, bytes: body.byteLength, duration: performance.now() - startedAt };
      } catch (error) {
        results[index] = { status: 0, bytes: 0, duration: performance.now() - startedAt, error: String(error) };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

function jsonRequest(path, body, address) {
  return new Request(`${origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, "CF-Connecting-IP": address },
    body: JSON.stringify(body),
  });
}

const serverRoot = fileURLToPath(new URL("../dist/server/", import.meta.url));
function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? javascriptFiles(path) : path.endsWith(".js") ? [path] : [];
  });
}
const moduleFiles = javascriptFiles(serverRoot);
moduleFiles.sort((left, right) => Number(relative(serverRoot, right) === "index.js") - Number(relative(serverRoot, left) === "index.js"));
const modules = moduleFiles.map((path) => ({ type: "ESModule", path: relative(serverRoot, path).replaceAll("\\", "/"), contents: readFileSync(path, "utf8") }));
const runtime = new Miniflare({
  modules,
  compatibilityDate: "2026-05-22",
  compatibilityFlags: ["nodejs_compat"],
  d1Databases: ["DB"],
  bindings: { ADMIN_AUTH_SECRET: "local-load-test-secret-that-never-leaves-this-process" },
  serviceBindings: { ASSETS: async () => new Response("Not found", { status: 404 }) },
});

try {
  const db = await runtime.getD1Database("DB");
  for (const file of migrations) {
    const sql = readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8");
    const statements = sql.split(";").map((statement) => statement.replaceAll("--> statement-breakpoint", "").trim()).filter(Boolean);
    await db.batch(statements.map((statement) => db.prepare(statement)));
  }

  const fetchApp = async (request) => runtime.dispatchFetch(request.url, {
    method: request.method,
    headers: Object.fromEntries(request.headers),
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
  });

  const tasks = [];
  for (let index = 0; index < 240; index++) {
    const status = ["attending", "maybe", "declined"][index % 3];
    tasks.push(() => fetchApp(jsonRequest("/api/rsvp", {
      submissionId: crypto.randomUUID(),
      name: `Yük Testi Davetlisi ${index + 1}`,
      status,
      guestCount: status === "attending" ? index % 4 + 1 : 0,
      note: index % 10 === 0 ? "Test notu" : "",
    }, `198.51.100.${index % 200 + 1}`)));
  }
  for (let index = 0; index < 80; index++) {
    tasks.push(() => fetchApp(jsonRequest("/api/memories", {
      submissionId: crypto.randomUUID(),
      name: `Yük Testi Galerisi ${index + 1}`,
      url: `https://drive.google.com/example-${index + 1}`,
    }, `203.0.113.${index % 80 + 1}`)));
  }
  for (let index = 0; index < 70; index++) {
    tasks.push(() => fetchApp(new Request(`${origin}/`, { headers: { Accept: "text/html" } })));
    tasks.push(() => fetchApp(new Request(`${origin}/api/settings`)));
    tasks.push(() => fetchApp(new Request(`${origin}/api/calendar`)));
    tasks.push(() => fetchApp(new Request(`${origin}/api/qr`)));
  }

  const startedAt = performance.now();
  const results = await runPool(tasks, concurrency);
  const elapsedMs = performance.now() - startedAt;
  const failures = results.filter((result) => result.status < 200 || result.status >= 400);
  const durations = results.map((result) => result.duration);
  const rsvpCount = Number(await db.prepare("SELECT COUNT(*) AS n FROM rsvps WHERE deleted_at IS NULL").first("n"));
  const mediaCount = Number(await db.prepare("SELECT COUNT(*) AS n FROM media_links WHERE deleted_at IS NULL").first("n"));

  assert.deepEqual(failures, [], `Başarısız HTTP yanıtları: ${JSON.stringify(failures.slice(0, 5))}`);
  assert.equal(rsvpCount, 240);
  assert.equal(mediaCount, 80);
  assert.ok(elapsedMs < 120_000, `Yük testi ${Math.round(elapsedMs)} ms sürdü`);

  console.log(JSON.stringify({
    result: "passed",
    isolation: "local-temporary-d1",
    requests: results.length,
    concurrency,
    writes: { rsvps: rsvpCount, memories: mediaCount },
    errors: failures.length,
    elapsed_ms: Math.round(elapsedMs),
    requests_per_second: Number((results.length / (elapsedMs / 1000)).toFixed(1)),
    latency_ms: {
      median: Math.round(percentile(durations, 0.5)),
      p95: Math.round(percentile(durations, 0.95)),
      max: Math.round(Math.max(...durations)),
    },
  }, null, 2));
} finally {
  await runtime.dispose();
}
