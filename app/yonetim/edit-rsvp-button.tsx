"use client";

import { FormEvent, useRef, useState } from "react";
import { useFormRequest } from "@/app/use-form-request";

type Rsvp = { id: string; name: string; status: "attending" | "maybe" | "declined"; guest_count: number; note: string };

export function EditRsvpButton({ rsvp }: { rsvp: Rsvp }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState(rsvp.status);
  const { sending, feedback, send } = useFormRequest();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await send("/api/admin/records", {
      id: rsvp.id,
      name: form.get("name"),
      status,
      guestCount: status === "attending" ? Number(form.get("guestCount")) : 0,
      note: form.get("note"),
    }, "Kayıt güncellendi.", "PATCH");
    if (ok) window.location.reload();
  }

  return <>
    <button className="record-action" type="button" onClick={() => dialog.current?.showModal()}>Düzenle</button>
    <dialog className="record-dialog" ref={dialog} onCancel={() => dialog.current?.close()}>
      <form onSubmit={save}>
        <div className="dialog-heading"><div><p className="eyebrow dark">LCV Kaydı</p><h2>Kaydı Düzenle</h2></div><button type="button" className="dialog-close" onClick={() => dialog.current?.close()} aria-label="Pencereyi kapat">×</button></div>
        <label>Ad Soyad<input name="name" defaultValue={rsvp.name} required minLength={2} maxLength={100} /></label>
        <label>Katılım Durumu<select name="status" value={status} onChange={(event) => setStatus(event.target.value as Rsvp["status"])}><option value="attending">Katılıyor</option><option value="maybe">Henüz net değil</option><option value="declined">Katılamıyor</option></select></label>
        {status === "attending" && <label>Kişi Sayısı<input name="guestCount" type="number" min={1} step={1} defaultValue={Math.max(1, rsvp.guest_count)} required /></label>}
        <label>Not<textarea name="note" defaultValue={rsvp.note} maxLength={500} rows={4} /></label>
        {feedback && <p className="form-feedback" role="status">{feedback}</p>}
        <div className="dialog-actions"><button className="button outline dark-outline" type="button" onClick={() => dialog.current?.close()}>Vazgeç</button><button className="button primary" disabled={sending}>{sending ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}</button></div>
      </form>
    </dialog>
  </>;
}
