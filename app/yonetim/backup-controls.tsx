"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { decryptBackup, encryptBackup } from "@/app/backup-crypto.mjs";
import { backupSummary } from "@/app/backup-format.mjs";

export function BackupControls() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [preparedDownload, setPreparedDownload] = useState<{ url: string; name: string } | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  useEffect(() => () => {
    if (preparedDownload) URL.revokeObjectURL(preparedDownload.url);
  }, [preparedDownload]);

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
      const url = URL.createObjectURL(new Blob([encrypted], { type: "application/octet-stream" }));
      setPreparedDownload({ url, name: `ozdil-huseyin-yedek-${day}.davetiye-backup` });
      setFeedback("Yedek hazır. Aşağıdaki indirme bağlantısına dokunarak dosyayı cihazınıza kaydedin.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Yedek alınamadı.");
    } finally { setWorking(false); }
  }

  function selectRestoreFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setRestoreFile(file);
    setFeedback(file ? `${file.name} seçildi. Parolayı doğrulayıp geri yükleme düğmesine basın.` : "");
  }

  async function restore() {
    if (!restoreFile || working) return;
    if (password.length < 12) { setFeedback("Önce yedeğin parolasını yazın."); return; }
    setWorking(true); setFeedback("");
    try {
      const backup = await decryptBackup(await restoreFile.text(), password);
      const summary = backupSummary(backup);
      const approved = window.confirm(`Yedekte ${summary.rsvps} LCV, ${summary.media} galeri bağlantısı ve ${summary.trash} çöp kaydı var. Yalnızca eksik kayıtlar eklenecek; mevcut kayıtlar değişmeyecek. Devam edilsin mi?`);
      if (!approved) { setFeedback("Geri yükleme iptal edildi."); return; }
      const response = await fetch("/api/admin/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(backup) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Geri yükleme tamamlanamadı.");
      setFeedback(`${data.added.rsvps} LCV, ${data.added.media} galeri bağlantısı ve ${data.added.settings} ayar eklendi.`);
      setRestoreFile(null);
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Yedek açılamadı.");
    } finally { setWorking(false); }
  }

  return <section className="admin-card backup-card">
    <div><h2>Tam Yedek</h2><p>LCV, galeri bağlantıları, albüm ayarı ve çöp kutusu dâhil şifreli bir yedek indirin.</p></div>
    <label>Yedek parolası<input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={256} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="En az 12 karakter" /></label>
    <label className="backup-password-toggle"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Parolayı göster</label>
    <div className="backup-actions"><button className="button primary" type="button" onClick={download} disabled={working}>{working ? "Hazırlanıyor…" : "Şifreli Yedek Hazırla"}</button>{preparedDownload && <a className="button download-ready" href={preparedDownload.url} download={preparedDownload.name} onClick={() => window.dispatchEvent(new Event("davetiye:backup-complete"))}>Hazır Yedeği İndir</a>}</div>
    <div className="backup-restore"><label className={`button outline dark-outline ${working ? "disabled" : ""}`}>Yedek Dosyasını Seç<input type="file" accept=".davetiye-backup,application/json,application/octet-stream" onChange={selectRestoreFile} disabled={working} /></label>{restoreFile && <span title={restoreFile.name}>{restoreFile.name}</span>}<button className="button outline dark-outline" type="button" onClick={restore} disabled={working || !restoreFile}>{working ? "İşleniyor…" : "Seçilen Yedeği Geri Yükle"}</button></div>
    <small>Bu parola sunucuya gönderilmez ve saklanmaz. Yedeği açabilmek için parolayı ayrıca koruyun.</small>
    {feedback && <p className="form-feedback" role="status">{feedback}</p>}
  </section>;
}
