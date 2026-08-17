"use client";

import { FormEvent, useState } from "react";

export function AdminControls({ albumUrl }: { albumUrl: string }) {
  const [feedback, setFeedback] = useState(""); const [saving, setSaving] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); const form = new FormData(event.currentTarget); const response = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ albumUrl: form.get("albumUrl") }) }); const data = await response.json().catch(() => ({})); setFeedback(response.ok ? "Ortak albüm bağlantısı güncellendi." : data.error ?? "Bağlantı güncellenemedi."); setSaving(false); }
  return <section className="admin-card album-setting"><div><h2>Ortak Albüm</h2><p>Bağlantıyı eklediğinizde davetiyedeki Anılar bölümünde otomatik görünür.</p></div><form onSubmit={save}><input name="albumUrl" type="url" defaultValue={albumUrl} placeholder="Google Fotoğraflar / Drive bağlantısı" /><button className="button primary" disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</button></form>{feedback && <p className="form-feedback" role="status">{feedback}</p>}</section>;
}
