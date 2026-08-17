import { ensureSchema, getDatabase } from "@/db/runtime";

const allowedStatuses = new Set(["attending", "maybe", "declined"]);

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.website) return Response.json({ ok: true });
    const name = String(body.name ?? "").trim().replace(/\s+/g, " ");
    const status = String(body.status ?? "");
    const note = String(body.note ?? "").trim();
    const guestCount = status === "attending" ? Number(body.guestCount) : 0;
    if (name.length < 2 || name.length > 100) return Response.json({ error: "Lütfen adınızı ve soyadınızı yazın." }, { status: 400 });
    if (!allowedStatuses.has(status)) return Response.json({ error: "Lütfen katılım durumunuzu seçin." }, { status: 400 });
    if (status === "attending" && (!Number.isSafeInteger(guestCount) || guestCount < 1)) return Response.json({ error: "Kişi sayısı en az 1 olmalıdır." }, { status: 400 });
    if (note.length > 500) return Response.json({ error: "Notunuz en fazla 500 karakter olabilir." }, { status: 400 });
    if (Date.now() > new Date("2026-10-24T19:00:00+03:00").getTime()) return Response.json({ error: "Katılım bildirimi süresi sona erdi." }, { status: 400 });
    await ensureSchema();
    await getDatabase().prepare("INSERT INTO rsvps (id, name, status, guest_count, note, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), name, status, guestCount, note, new Date().toISOString()).run();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Katılım bildirimi kaydedilemedi. Lütfen yeniden deneyin." }, { status: 500 });
  }
}
