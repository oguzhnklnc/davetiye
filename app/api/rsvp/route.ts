import { ensureSchema, getDatabase } from "@/db/runtime";
import { getRequestLimit, rateLimitResponse, recordSecurityEvent, rejectCrossOriginRequest } from "@/app/security";

const allowedStatuses = new Set(["attending", "maybe", "declined"]);

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOriginRequest(request);
    if (originError) return originError;
    const body = await request.json() as Record<string, unknown>;
    if (body.website) return Response.json({ ok: true });
    const name = String(body.name ?? "").trim().replace(/\s+/g, " ");
    const status = String(body.status ?? "");
    const note = String(body.note ?? "").trim();
    const guestCount = status === "attending" ? Number(body.guestCount) : 0;
    const suppliedId = String(body.submissionId ?? "");
    const submissionId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(suppliedId) ? suppliedId : crypto.randomUUID();
    if (name.length < 2 || name.length > 100) return Response.json({ error: "Lütfen adınızı ve soyadınızı yazın." }, { status: 400 });
    if (!allowedStatuses.has(status)) return Response.json({ error: "Lütfen katılım durumunuzu seçin." }, { status: 400 });
    if (status === "attending" && (!Number.isSafeInteger(guestCount) || guestCount < 1)) return Response.json({ error: "Kişi sayısı en az 1 olmalıdır." }, { status: 400 });
    if (note.length > 500) return Response.json({ error: "Notunuz en fazla 500 karakter olabilir." }, { status: 400 });
    if (Date.now() > new Date("2026-10-24T19:00:00+03:00").getTime()) return Response.json({ error: "Katılım bildirimi süresi sona erdi." }, { status: 400 });
    await ensureSchema();
    const db = getDatabase();
    const duplicate = await db.prepare("SELECT id FROM rsvps WHERE id = ?").bind(submissionId).first<{ id: string }>();
    if (duplicate) return Response.json({ ok: true, duplicate: true });
    const limit = await getRequestLimit(request, "rsvp_submitted", 5, 60 * 60);
    if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
    await db.prepare("INSERT INTO rsvps (id, name, status, guest_count, note, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(submissionId, name, status, guestCount, note, new Date().toISOString()).run();
    await recordSecurityEvent("rsvp_submitted", limit.fingerprint);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Katılım bildirimi kaydedilemedi. Lütfen yeniden deneyin." }, { status: 500 });
  }
}
