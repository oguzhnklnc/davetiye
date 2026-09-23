import { clearAdminSession, isAdminAuthenticated } from "@/app/admin-auth";
import { rejectCrossOriginRequest } from "@/app/security";
import { ensureSchema, getDatabase } from "@/db/runtime";
import { revokeAdminSessions } from "@/db/admin-session.mjs";

const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Yetkisiz erişim." }, { status: 403, headers });
  try {
    await ensureSchema();
    await revokeAdminSessions(getDatabase());
    await clearAdminSession();
    return Response.json({ ok: true }, { headers });
  } catch {
    console.error("admin_session_revocation_failed");
    return Response.json({ error: "Oturumlar kapatılamadı. Lütfen yeniden deneyin." }, { status: 503, headers });
  }
}
