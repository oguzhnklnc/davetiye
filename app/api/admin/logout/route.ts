import { clearAdminSession } from "@/app/admin-auth";
import { rejectCrossOriginRequest } from "@/app/security";

export async function POST(request: Request) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;
  await clearAdminSession();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
