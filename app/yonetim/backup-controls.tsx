"use client";

import { ChangeEvent, useState } from "react";
import { decryptBackup, encryptBackup } from "@/app/backup-crypto.mjs";
import { backupSummary } from "@/app/backup-format.mjs";

export function BackupControls() {
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function download() {
    if (working) return;
    if (password.length < 12) { setFeedback("Yedek parolası en az 12 karakter olmalıdır."); return; }
    setWorking(true); setFeedback("");
    try {
      const response = await fetch("/api/admin/backup", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Yedek alınamadı.");
      const encrypted = await encryptBackup(data, password);
      const day = new Date().toISOString().slice(0, 10);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([encrypted], { type: "application/json" }));
      link.download = `ozdil-huseyin-yedek-${day}.davetiye-backup`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      setFeedback("Şifreli tam yedek indirildi. Parolayı güvenli bir yerde saklayın; parola olmadan yedek açılamaz.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Yedek alınamadı.");
    } finally { setWorking(false); }
  }

  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || working) return;
    if (password.length < 12) { setFeedback("Önce yedeğin parolasını yazın."); return; }
    setWorking(true); setFeedback("");
    try {
      const backup = await decryptBackup(await file.text(), password);
      const summary = backupSummary(backup);
      const approved = window.confirm(`Yedekte ${summary.rsvps} LCV, ${summary.media} galeri bağlantısı ve ${summary.trash} çöp kaydı var. Yalnızca eksik kayıtlar eklenecek; mevcut kayıtlar değişmeyecek. Devam edilsin mi?`);
      if (!approved) { setFeedback("Geri yükleme iptal edildi."); return; }
      const response = await fetch("/api/admin/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(backup) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Geri yükleme tamamlanamadı.");
      setFeedback(`${data.added.rsvps} LCV, ${data.added.media} galeri bağlantısı ve ${data.added.settings} ayar eklendi.`);
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Yedek açılamadı.");
    } finally { setWorking(false); }
  }

  return <section className="admin-card backup-card">
    <div><h2>Tam Yedek</h2><p>LCV, galeri bağlantıları, albüm ayarı ve çöp kutusu dâhil şifreli bir yedek indirin.</p></div>
    <label>Yedek parolası<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={256} autoComplete="new-password" placeholder="En az 12 karakter" /></label>
    <div className="backup-actions"><button className="button primary" type="button" onClick={download} disabled={working}>{working ? "İşleniyor…" : "Şifreli Yedek İndir"}</button><label className={`button outline dark-outline ${working ? "disabled" : ""}`}>Yedeği Geri Yükle<input type="file" accept=".davetiye-backup,application/json" onChange={restore} disabled={working} /></label></div>
    <small>Bu parola sunucuya gönderilmez ve saklanmaz. Yedeği açabilmek için parolayı ayrıca koruyun.</small>
    {feedback && <p className="form-feedback" role="status">{feedback}</p>}
  </section>;
}
