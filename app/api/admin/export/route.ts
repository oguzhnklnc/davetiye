import { isAdminAuthenticated } from "@/app/admin-auth";
import { ensureSchema, getDatabase } from "@/db/runtime";
import { csvCell } from "@/app/csv.mjs";

export async function GET() {
  if (!(await isAdminAuthenticated())) return new Response("Yetkisiz erişim.", { status: 403 });
  await ensureSchema();
  const result = await getDatabase().prepare("SELECT name, status, guest_count, note, created_at FROM rsvps WHERE deleted_at IS NULL ORDER BY created_at DESC").all<{ name: string; status: string; guest_count: number; note: string; created_at: string }>();
  const labels: Record<string, string> = { attending: "Katılıyor", maybe: "Henüz net değil", declined: "Katılamıyor" };
  const rows = result.results.map((item) => [item.name, labels[item.status], item.guest_count, item.note, item.created_at].map(csvCell).join(","));
  const content = "\uFEFF" + [["Ad Soyad", "Durum", "Kişi Sayısı", "Not", "Gönderim Tarihi"].map(csvCell).join(","), ...rows].join("\r\n");
  return new Response(content, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=katilim-bildirimleri.csv", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
