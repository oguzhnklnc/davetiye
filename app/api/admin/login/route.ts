import { createAdminSession, verifyAdminCredentials } from "@/app/admin-auth";
import { jsonBodyErrorResponse, readJsonBody } from "@/app/request-body.mjs";
import { getRequestLimit, rateLimitResponse, recordSecurityEvent, rejectCrossOriginRequest } from "@/app/security";

export async function POST(request: Request) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;
  let body: Record<string, unknown>;
  try { body = await readJsonBody(request, 2_048); }
  catch (error) { return jsonBodyErrorResponse(error) ?? Response.json({ error: "Giriş isteği işlenemedi." }, { status: 400 }); }
  const limit = await getRequestLimit(request, "admin_login_failed", 5, 15 * 60);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  const username = String(body.username ?? "");
  const password = String(body.password ?? "");
  const valid = username.length <= 100 && password.length <= 256 && await verifyAdminCredentials(username, password);
  if (!valid) {
    await recordSecurityEvent("admin_login_failed", limit.fingerprint);
    await new Promise((resolve) => setTimeout(resolve, 450));
    if (limit.count + 1 >= 5) return rateLimitResponse(15 * 60);
    return Response.json({ error: "Kullanıcı adı veya parola hatalı." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  await createAdminSession();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
