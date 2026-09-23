"use client";

import { useState } from "react";

export function SecurityControls() {
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);

  async function revoke() {
    if (!window.confirm("Tüm cihazlardaki yönetici oturumları kapatılacak. Devam edilsin mi?")) return;
    setSending(true); setFeedback("");
    try {
      const response = await fetch("/api/admin/sessions", { method: "POST", headers: { Accept: "application/json" } });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "İşlem tamamlanamadı.");
      window.location.assign("/yonetim");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
      setSending(false);
    }
  }

  return <section className="admin-card security-controls"><div><h2>Yönetici Güvenliği</h2><p>Şüpheli bir erişim durumunda tüm cihazlardaki yönetici oturumlarını tek adımda kapatın.</p></div><button className="button danger-button" type="button" onClick={revoke} disabled={sending}>{sending ? "Oturumlar kapatılıyor…" : "Tüm Oturumları Kapat"}</button>{feedback && <p className="form-feedback error" role="alert">{feedback}</p>}</section>;
}
