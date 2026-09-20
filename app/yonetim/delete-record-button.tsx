"use client";

import { useFormRequest } from "@/app/use-form-request";

export function DeleteRecordButton({ id, type, label, restore = false }: { id: string; type: "rsvp" | "memory"; label: string; restore?: boolean }) {
  const { sending, feedback, send } = useFormRequest();
  async function change() {
    if (!restore && !window.confirm(`${label} kaydı çöp kutusuna taşınacak. Daha sonra geri alabilirsiniz. Devam edilsin mi?`)) return;
    if (await send("/api/admin/records", { id, type }, "İşlem tamamlandı.", restore ? "POST" : "DELETE")) window.location.reload();
  }
  return <div><button className="delete-record" type="button" onClick={change} disabled={sending}>{sending ? "İşleniyor…" : restore ? "Geri al" : "Çöp kutusuna taşı"}</button>{feedback && <p role="status">{feedback}</p>}</div>;
}
