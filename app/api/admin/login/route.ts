import { createAdminSession, verifyAdminCredentials } from "@/app/admin-auth";
import { getRequestLimit, rateLimitResponse, recordSecurityEvent, rejectCrossOriginRequest } from "@/app/security";

export async function POST(request: Request) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;
  const limit = await getRequestLimit(request, "admin_login_failed", 5, 15 * 60);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  const body = await request.json().catch(() => ({})) as { username?: unknown; password?: unknown };
  const valid = await verifyAdminCredentials(String(body.username ?? ""), String(body.password ?? ""));
  if (!valid) {
    await recordSecurityEvent("admin_login_failed", limit.fingerprint);
    await new Promise((resolve) => setTimeout(resolve, 450));
    if (limit.count + 1 >= 5) return rateLimitResponse(15 * 60);
    return Response.json({ error: "Kullanıcı adı veya parola hatalı." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  await createAdminSession();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
