"use client";

import { useFormRequest } from "@/app/use-form-request";

export function DeleteRecordButton({ id, type, label, restore = false, permanent = false }: { id: string; type: "rsvp" | "memory"; label: string; restore?: boolean; permanent?: boolean }) {
  const { sending, feedback, send } = useFormRequest();
  async function change() {
    const message = permanent
      ? `${label} kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz. Kayıt eski bir yedekte varsa o yedek geri yüklendiğinde yeniden oluşabilir. Devam edilsin mi?`
      : `${label} kaydı çöp kutusuna taşınacak. Daha sonra geri alabilirsiniz. Devam edilsin mi?`;
    if (!restore && !window.confirm(message)) return;
    if (await send("/api/admin/records", { id, type, permanent }, permanent ? "Kayıt kalıcı olarak silindi." : "İşlem tamamlandı.", restore ? "POST" : "DELETE")) window.location.reload();
  }
  return <div><button className={`delete-record ${permanent ? "permanent-delete" : ""}`} type="button" onClick={change} disabled={sending}>{sending ? "İşleniyor…" : permanent ? "Kalıcı sil" : restore ? "Geri al" : "Çöp kutusuna taşı"}</button>{feedback && <p role="status">{feedback}</p>}</div>;
}
