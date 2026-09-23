import { isAdminAuthenticated } from "@/app/admin-auth";
import { rejectCrossOriginRequest } from "@/app/security";
import { ensureSchema, getDatabase } from "@/db/runtime";
import { changeTrashState, permanentlyDeleteTrashRecord } from "@/db/trash.mjs";
import { jsonBodyErrorResponse, readJsonBody } from "@/app/request-body.mjs";
import { mergeRsvps, updateRsvp } from "@/db/rsvp-management.mjs";

const headers = { "Cache-Control": "no-store" };
async function change(request: Request, restore: boolean) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Yetkisiz erişim." }, { status: 403, headers });
  let body: Record<string, unknown>;
  try { body = await readJsonBody(request, 1_024); }
  catch (error) { return jsonBodyErrorResponse(error) ?? Response.json({ error: "İstek işlenemedi." }, { status: 400, headers }); }
  const id = String(body?.id ?? "");
  const type = String(body?.type ?? "");
  const permanent = body?.permanent === true;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["rsvp", "memory"].includes(type)) return Response.json({ error: "Geçersiz kayıt." }, { status: 400, headers });
  try {
    await ensureSchema();
    const changed = permanent
      ? await permanentlyDeleteTrashRecord(getDatabase(), { type, id })
      : await changeTrashState(getDatabase(), { type, id, restore });
    if (!changed) return Response.json({ error: permanent ? "Kayıt çöp kutusunda bulunamadı." : "Kayıt bulunamadı veya zaten güncel durumda." }, { status: 404, headers });
    return Response.json({ ok: true }, { headers });
  } catch {
    console.error("trash_operation_failed");
    return Response.json({ error: "İşlem tamamlanamadı. Lütfen yeniden deneyin." }, { status: 503, headers });
  }
}
export async function DELETE(request: Request) { return change(request, false); }
export async function POST(request: Request) { return change(request, true); }

export async function PATCH(request: Request) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Yetkisiz erişim." }, { status: 403, headers });
  let body: Record<string, unknown>;
  try { body = await readJsonBody(request, 4_096); }
  catch (error) { return jsonBodyErrorResponse(error) ?? Response.json({ error: "İstek işlenemedi." }, { status: 400, headers }); }
  const id = String(body.id ?? "");
  const name = String(body.name ?? "").trim().replace(/\s+/g, " ");
  const status = String(body.status ?? "");
  const note = String(body.note ?? "").trim();
  const guestCount = status === "attending" ? Number(body.guestCount) : 0;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Geçersiz kayıt." }, { status: 400, headers });
  if (name.length < 2 || name.length > 100) return Response.json({ error: "Ad soyad 2–100 karakter olmalıdır." }, { status: 400, headers });
  if (!["attending", "maybe", "declined"].includes(status)) return Response.json({ error: "Geçerli bir katılım durumu seçin." }, { status: 400, headers });
  if (status === "attending" && (!Number.isSafeInteger(guestCount) || guestCount < 1)) return Response.json({ error: "Kişi sayısı en az 1 olmalıdır." }, { status: 400, headers });
  if (note.length > 500) return Response.json({ error: "Not en fazla 500 karakter olabilir." }, { status: 400, headers });
  try {
    await ensureSchema();
    const changed = await updateRsvp(getDatabase(), { id, name, status, guestCount, note });
    if (!changed) return Response.json({ error: "Kayıt bulunamadı veya daha önce silindi." }, { status: 404, headers });
    return Response.json({ ok: true }, { headers });
  } catch {
    console.error("admin_rsvp_update_failed");
    return Response.json({ error: "Kayıt güncellenemedi. Lütfen yeniden deneyin." }, { status: 503, headers });
  }
}

export async function PUT(request: Request) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Yetkisiz erişim." }, { status: 403, headers });
  let body: Record<string, unknown>;
  try { body = await readJsonBody(request, 1_024); }
  catch (error) { return jsonBodyErrorResponse(error) ?? Response.json({ error: "İstek işlenemedi." }, { status: 400, headers }); }
  const keepId = String(body.keepId ?? "");
  const removeId = String(body.removeId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(keepId) || !/^[0-9a-f-]{36}$/i.test(removeId) || keepId === removeId) return Response.json({ error: "Geçersiz kayıt seçimi." }, { status: 400, headers });
  try {
    await ensureSchema();
    const changed = await mergeRsvps(getDatabase(), { keepId, removeId });
    if (!changed) return Response.json({ error: "Kayıtlardan biri bulunamadı veya daha önce silindi." }, { status: 404, headers });
    return Response.json({ ok: true }, { headers });
  } catch {
    console.error("admin_rsvp_merge_failed");
    return Response.json({ error: "Kayıtlar birleştirilemedi. Lütfen yeniden deneyin." }, { status: 503, headers });
  }
}
