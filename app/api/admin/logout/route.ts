import { clearAdminSession } from "@/app/admin-auth";

export async function POST() {
  await clearAdminSession();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
