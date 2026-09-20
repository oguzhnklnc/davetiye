import { ensureSchema, getDatabase } from "@/db/runtime";
import { getSubmissionIdentity, rateLimitResponse, rejectCrossOriginRequest } from "@/app/security";
import { saveSubmission, submissionRetryAfter } from "@/db/save-submission.mjs";
import { jsonBodyErrorResponse, readJsonBody } from "@/app/request-body.mjs";

const allowedStatuses = new Set(["attending", "maybe", "declined"]);

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOriginRequest(request);
    if (originError) return originError;
    const body = await readJsonBody(request, 4_096) as Record<string, unknown>;
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
    const identity = await getSubmissionIdentity(request);
    const result = await saveSubmission(db, { type: "rsvp", id: submissionId, values: [name, status, guestCount, note], fingerprint: identity.fingerprint, networkFingerprint: identity.networkFingerprint });
    if (result === "limited") return identity.respond(rateLimitResponse(await submissionRetryAfter(db, { type: "rsvp", ...identity })));
    if (result === "conflict") return identity.respond(Response.json({ error: "Önceki gönderiminiz zaten kaydedilmiş. Değiştirdiğiniz bilgiler kaydedilmedi; düzeltme için düğün sahipleriyle iletişime geçin." }, { status: 409 }));
    return identity.respond(Response.json({ ok: true, duplicate: result === "duplicate" }));
  } catch (error) {
    const bodyError = jsonBodyErrorResponse(error);
    if (bodyError) return bodyError;
    return Response.json({ error: "Katılım bildirimi kaydedilemedi. Lütfen yeniden deneyin." }, { status: 500 });
  }
}
