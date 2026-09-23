import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const clientRoot = fileURLToPath(new URL("../dist/client/", import.meta.url));

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : path;
  }));
  return files.flat();
}

test("mobil istemci paketleri performans bütçesini aşmaz", async () => {
  const files = await filesBelow(clientRoot);
  const assets = await Promise.all(files
    .filter((path) => [".js", ".css"].includes(extname(path)))
    .map(async (path) => ({ name: basename(path), size: (await stat(path)).size })));

  const largestScript = Math.max(...assets.filter((asset) => extname(asset.name) === ".js").map((asset) => asset.size));
  const largestStyle = Math.max(...assets.filter((asset) => extname(asset.name) === ".css").map((asset) => asset.size));
  const invitationScript = assets.find((asset) => asset.name.startsWith("invitation-experience-"));

  assert.ok(largestScript <= 225_000, `En büyük JavaScript paketi ${largestScript} bayt`);
  assert.ok(largestStyle <= 50_000, `En büyük stil paketi ${largestStyle} bayt`);
  assert.ok(invitationScript, "Davetiye istemci paketi bulunamadı");
  assert.ok(invitationScript.size <= 30_000, `Davetiye istemci paketi ${invitationScript.size} bayt`);
});
