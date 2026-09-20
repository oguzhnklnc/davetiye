import { ensureSchema, getDatabase } from "@/db/runtime";
import { getRequestLimit, rateLimitResponse, rejectCrossOriginRequest } from "@/app/security";
import { saveSubmission } from "@/db/save-submission.mjs";

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
    const limit = await getRequestLimit(request, "memory_submitted", 10, 60 * 60);
    const result = await saveSubmission(db, { type: "memory", id: submissionId, values: [name, url.toString()], fingerprint: limit.fingerprint });
    if (result === "limited") return rateLimitResponse(limit.retryAfter || 3600);
    if (result === "conflict") return Response.json({ error: "Önceki bağlantınız zaten kaydedilmiş. Değiştirdiğiniz bilgiler kaydedilmedi; düzeltme için düğün sahipleriyle iletişime geçin." }, { status: 409 });
    return Response.json({ ok: true, duplicate: result === "duplicate" });
  } catch {
    return Response.json({ error: "Bağlantı kaydedilemedi. Lütfen yeniden deneyin." }, { status: 500 });
  }
}
