import { isAdminAuthenticated } from "@/app/admin-auth";
import { recordRequestSecurityEvent, rejectCrossOriginRequest } from "@/app/security";
import { BACKUP_LIMIT, validateBackup } from "@/app/backup-format.mjs";
import { exportBackup, restoreBackup } from "@/db/backup.mjs";
import { ensureSchema, getDatabase } from "@/db/runtime";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Yetkisiz erişim." }, { status: 403, headers });
  try {
    await ensureSchema();
    const backup = await exportBackup(getDatabase());
    if (new TextEncoder().encode(JSON.stringify(backup)).length > BACKUP_LIMIT) return Response.json({ error: "Yedek 5 MB sınırını aşıyor; destek gerekiyor." }, { status: 413, headers });
    await recordRequestSecurityEvent(request, "admin_backup_exported").catch(() => console.error("backup_export_audit_failed"));
    return Response.json(backup, { headers });
  } catch {
    console.error("backup_export_failed");
    return Response.json({ error: "Yedek hazırlanamadı. Lütfen yeniden deneyin." }, { status: 503, headers });
  }
}

async function readBackup(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Yedek dosyası eksik.");
  const decoder = new TextDecoder();
  let size = 0, content = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > BACKUP_LIMIT) { await reader.cancel(); throw new Error("Yedek 5 MB sınırını aşıyor."); }
      content += decoder.decode(value, { stream: true });
    }
    content += decoder.decode();
    return validateBackup(JSON.parse(content));
  } finally { reader.releaseLock(); }
}

export async function POST(request: Request) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Yetkisiz erişim." }, { status: 403, headers });
  let backup;
  try { backup = await readBackup(request); }
  catch { return Response.json({ error: "Yedek dosyası geçersiz veya 5 MB sınırını aşıyor." }, { status: 400, headers }); }
  try {
    await ensureSchema();
    const added = await restoreBackup(getDatabase(), backup);
    await recordRequestSecurityEvent(request, "admin_backup_restored").catch(() => console.error("backup_restore_audit_failed"));
    return Response.json({ ok: true, added }, { headers });
  } catch {
    console.error("backup_restore_failed");
    return Response.json({ error: "Geri yükleme tamamlanamadı. Değişiklikler geri alındı; yeniden deneyebilirsiniz." }, { status: 503, headers });
  }
}
