import { isAdminAuthenticated } from "@/app/admin-auth";
import { recordRequestSecurityEvent, rejectCrossOriginRequest } from "@/app/security";
import { ensureSchema, getDatabase } from "@/db/runtime";

const recordTypes = {
  rsvp: "rsvps",
  memory: "media_links",
} as const;

export async function DELETE(request: Request) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Yetkisiz erişim." }, { status: 403, headers: { "Cache-Control": "no-store" } });

  const body = await request.json().catch(() => ({})) as { id?: unknown; type?: unknown };
  const id = String(body.id ?? "");
  const type = String(body.type ?? "") as keyof typeof recordTypes;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(type in recordTypes)) return Response.json({ error: "Geçersiz kayıt." }, { status: 400 });

  await ensureSchema();
  const table = recordTypes[type];
  await getDatabase().prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
  await recordRequestSecurityEvent(request, `admin_deleted_${type}`);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
