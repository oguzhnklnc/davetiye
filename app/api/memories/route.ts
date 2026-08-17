import { ensureSchema, getDatabase } from "@/db/runtime";

const allowedHosts = new Set(["photos.app.goo.gl", "photos.google.com", "drive.google.com", "docs.google.com"]);

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.website) return Response.json({ ok: true });
    const name = String(body.name ?? "").trim().replace(/\s+/g, " ");
    const rawUrl = String(body.url ?? "").trim();
    let url: URL;
    try { url = new URL(rawUrl); } catch { return Response.json({ error: "Lütfen geçerli bir bağlantı girin." }, { status: 400 }); }
    if (name.length < 2 || name.length > 100) return Response.json({ error: "Lütfen adınızı yazın." }, { status: 400 });
    if (url.protocol !== "https:" || !allowedHosts.has(url.hostname.toLocaleLowerCase("en-US"))) return Response.json({ error: "Lütfen bir Google Fotoğraflar veya Google Drive bağlantısı gönderin." }, { status: 400 });
    await ensureSchema();
    await getDatabase().prepare("INSERT INTO media_links (id, name, url, created_at) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), name, url.toString(), new Date().toISOString()).run();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Bağlantı kaydedilemedi. Lütfen yeniden deneyin." }, { status: 500 });
  }
}
