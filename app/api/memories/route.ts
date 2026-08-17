import { ensureSchema, getDatabase } from "@/db/runtime";
import { getRequestLimit, rateLimitResponse, recordSecurityEvent, rejectCrossOriginRequest } from "@/app/security";

const allowedHosts = new Set(["photos.app.goo.gl", "photos.google.com", "drive.google.com", "docs.google.com"]);

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOriginRequest(request);
    if (originError) return originError;
    const body = await request.json() as Record<string, unknown>;
    if (body.website) return Response.json({ ok: true });
    const name = String(body.name ?? "").trim().replace(/\s+/g, " ");
    const rawUrl = String(body.url ?? "").trim();
    const suppliedId = String(body.submissionId ?? "");
    const submissionId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(suppliedId) ? suppliedId : crypto.randomUUID();
    let url: URL;
    try { url = new URL(rawUrl); } catch { return Response.json({ error: "Lütfen geçerli bir bağlantı girin." }, { status: 400 }); }
    if (name.length < 2 || name.length > 100) return Response.json({ error: "Lütfen adınızı yazın." }, { status: 400 });
    if (url.protocol !== "https:" || !allowedHosts.has(url.hostname.toLocaleLowerCase("en-US"))) return Response.json({ error: "Lütfen bir Google Fotoğraflar veya Google Drive bağlantısı gönderin." }, { status: 400 });
    await ensureSchema();
    const db = getDatabase();
    const duplicate = await db.prepare("SELECT id FROM media_links WHERE id = ?").bind(submissionId).first<{ id: string }>();
    if (duplicate) return Response.json({ ok: true, duplicate: true });
    const limit = await getRequestLimit(request, "memory_submitted", 10, 60 * 60);
    if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
    await db.prepare("INSERT INTO media_links (id, name, url, created_at) VALUES (?, ?, ?, ?)").bind(submissionId, name, url.toString(), new Date().toISOString()).run();
    await recordSecurityEvent("memory_submitted", limit.fingerprint);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Bağlantı kaydedilemedi. Lütfen yeniden deneyin." }, { status: 500 });
  }
}
