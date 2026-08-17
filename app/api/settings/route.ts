import { ensureSchema, getDatabase } from "@/db/runtime";

export async function GET() {
  try {
    await ensureSchema();
    const row = await getDatabase().prepare("SELECT value FROM settings WHERE key = ?").bind("album_url").first<{ value: string }>();
    return Response.json({ albumUrl: row?.value || null });
  } catch {
    return Response.json({ albumUrl: null });
  }
}
