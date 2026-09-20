import { isAdminAuthenticated } from "@/app/admin-auth";
import { rejectCrossOriginRequest } from "@/app/security";
import { ensureSchema, getDatabase } from "@/db/runtime";
import { changeTrashState } from "@/db/trash.mjs";
import { jsonBodyErrorResponse, readJsonBody } from "@/app/request-body.mjs";

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
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["rsvp", "memory"].includes(type)) return Response.json({ error: "Geçersiz kayıt." }, { status: 400, headers });
  try {
    await ensureSchema();
    await changeTrashState(getDatabase(), { type, id, restore });
    return Response.json({ ok: true }, { headers });
  } catch {
    console.error("trash_operation_failed");
    return Response.json({ error: "İşlem tamamlanamadı. Lütfen yeniden deneyin." }, { status: 503, headers });
  }
}
export async function DELETE(request: Request) { return change(request, false); }
export async function POST(request: Request) { return change(request, true); }
