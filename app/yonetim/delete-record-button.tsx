"use client";

import { useState } from "react";

export function DeleteRecordButton({ id, type, label }: { id: string; type: "rsvp" | "memory"; label: string }) {
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!window.confirm(`${label} kaydını kalıcı olarak silmek istediğinizden emin misiniz?`)) return;
    setDeleting(true);
    const response = await fetch("/api/admin/records", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, type }),
    });
    if (response.ok) window.location.reload();
    else {
      const data = await response.json().catch(() => ({}));
      window.alert(data.error ?? "Kayıt silinemedi.");
      setDeleting(false);
    }
  }

  return <button className="delete-record" type="button" onClick={remove} disabled={deleting}>{deleting ? "Siliniyor…" : "Sil"}</button>;
}
