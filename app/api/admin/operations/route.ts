import { isAdminAuthenticated } from "@/app/admin-auth";
import { jsonBodyErrorResponse, readJsonBody } from "@/app/request-body.mjs";
import { rejectCrossOriginRequest } from "@/app/security";
import { getOperationalSnapshot, saveOperationsChecklist } from "@/db/operations.mjs";
import { ensureSchema, getDatabase } from "@/db/runtime";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function GET() {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Yetkisiz erişim." }, { status: 403, headers });
  try {
    await ensureSchema();
    return Response.json(await getOperationalSnapshot(getDatabase()), { headers });
  } catch {
    console.error("admin_operations_health_failed");
    return Response.json({ error: "Sistem durumu alınamadı." }, { status: 503, headers });
  }
}

export async function PATCH(request: Request) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Yetkisiz erişim." }, { status: 403, headers });
  let body: Record<string, unknown>;
  try { body = await readJsonBody(request, 2_048); }
  catch (error) { return jsonBodyErrorResponse(error) ?? Response.json({ error: "İstek işlenemedi." }, { status: 400, headers }); }
  try {
    await ensureSchema();
    const checklist = await saveOperationsChecklist(getDatabase(), body.checklist);
    return Response.json({ ok: true, checklist }, { headers });
  } catch {
    console.error("admin_operations_checklist_failed");
    return Response.json({ error: "Kontrol listesi kaydedilemedi." }, { status: 503, headers });
  }
}
