import { createAdminSession, verifyAdminCredentials } from "@/app/admin-auth";

export async function POST(request: Request) {
  const body = await request.json() as { username?: unknown; password?: unknown };
  const valid = await verifyAdminCredentials(String(body.username ?? ""), String(body.password ?? ""));
  if (!valid) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return Response.json({ error: "Kullanıcı adı veya parola hatalı." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  await createAdminSession();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
