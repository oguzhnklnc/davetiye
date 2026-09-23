"use client";

import { useFormRequest } from "@/app/use-form-request";

export function MergeRsvpButton({ keepId, keepName, removeId, removeName }: { keepId: string; keepName: string; removeId: string; removeName: string }) {
  const { sending, feedback, send } = useFormRequest();
  async function merge() {
    if (!window.confirm(`${keepName} kaydı korunacak; ${removeName} kaydı çöp kutusuna taşınacak. Devam edilsin mi?`)) return;
    if (await send("/api/admin/records", { keepId, removeId }, "Kayıtlar birleştirildi.", "PUT")) window.location.reload();
  }
  return <div className="merge-action"><button className="record-action" type="button" onClick={merge} disabled={sending}>{sending ? "Birleştiriliyor…" : "Bu Kaydı Koru"}</button>{feedback && <p className="form-feedback" role="status">{feedback}</p>}</div>;
}
