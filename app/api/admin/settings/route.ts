import { isAdminAuthenticated } from "@/app/admin-auth";
import { ensureSchema, getDatabase } from "@/db/runtime";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Yetkisiz erişim." }, { status: 403 });
  const body = await request.json() as { albumUrl?: unknown }; const value = String(body.albumUrl ?? "").trim();
  if (value) { try { const url = new URL(value); if (url.protocol !== "https:") throw new Error(); } catch { return Response.json({ error: "Geçerli bir HTTPS bağlantısı girin." }, { status: 400 }); } }
  await ensureSchema();
  if (value) await getDatabase().prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind("album_url", value, new Date().toISOString()).run();
  else await getDatabase().prepare("DELETE FROM settings WHERE key = ?").bind("album_url").run();
  return Response.json({ ok: true });
}
