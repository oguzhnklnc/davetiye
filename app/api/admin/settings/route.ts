import { isAdminAuthenticated } from "@/app/admin-auth";
import { ensureSchema, getDatabase } from "@/db/runtime";
import { rejectCrossOriginRequest } from "@/app/security";
import { jsonBodyErrorResponse, readJsonBody } from "@/app/request-body.mjs";

export async function POST(request: Request) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Yetkisiz erişim." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await readJsonBody(request, 4_096); }
  catch (error) { return jsonBodyErrorResponse(error) ?? Response.json({ error: "İstek işlenemedi." }, { status: 400 }); }
  const value = String(body.albumUrl ?? "").trim();
  if (value.length > 2_048) return Response.json({ error: "Bağlantı en fazla 2048 karakter olabilir." }, { status: 400 });
  if (value) { try { const url = new URL(value); if (url.protocol !== "https:") throw new Error(); } catch { return Response.json({ error: "Geçerli bir HTTPS bağlantısı girin." }, { status: 400 }); } }
  await ensureSchema();
  if (value) await getDatabase().prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind("album_url", value, new Date().toISOString()).run();
  else await getDatabase().prepare("DELETE FROM settings WHERE key = ?").bind("album_url").run();
  return Response.json({ ok: true });
}
