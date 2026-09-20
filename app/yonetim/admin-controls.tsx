"use client";

import { FormEvent } from "react";
import { useFormRequest } from "@/app/use-form-request";

export function AdminControls({ albumUrl }: { albumUrl: string }) {
  const { feedback, sending: saving, send } = useFormRequest();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await send("/api/admin/settings", { albumUrl: form.get("albumUrl") }, "Ortak albüm bağlantısı güncellendi.");
  }
  return <section className="admin-card album-setting"><div><h2>Ortak Albüm</h2><p>Bağlantıyı eklediğinizde davetiyedeki Anılar bölümünde otomatik görünür.</p></div><form onSubmit={save}><input name="albumUrl" type="url" defaultValue={albumUrl} placeholder="Google Fotoğraflar / Drive bağlantısı" /><button className="button primary" disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</button></form>{feedback && <p className="form-feedback" role="status">{feedback}</p>}</section>;
}
