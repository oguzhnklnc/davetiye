"use client";

import { useEffect, useMemo, useState } from "react";
import { checklistProgress } from "@/app/operations.mjs";

type Snapshot = {
  checkedAt: string; database: string; activeRsvps: number; guestTotal: number; maybeResponses: number; activeMedia: number;
  trashCount: number; invalidRecords: number; duplicatePairs: number; albumConfigured: boolean; lastSubmissionAt: string | null;
  lastBackupAt: string | null; backup: { status: string; maxAgeDays: number }; failedLogins24h: number;
  checklist: Record<string, boolean>;
};

const date = (value: string | null) => value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value)) : "Henüz yok";

export function OperationsPanel({ initialSnapshot }: { initialSnapshot: Snapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [feedback, setFeedback] = useState("");
  const progress = useMemo(() => checklistProgress(snapshot), [snapshot]);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true); setFeedback("");
    try {
      const response = await fetch("/api/admin/operations", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sistem durumu alınamadı.");
      setSnapshot(data);
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Sistem durumu alınamadı."); }
    finally { setRefreshing(false); }
  }

  async function toggle(key: string, checked: boolean) {
    if (savingKey) return;
    setSavingKey(key); setFeedback("");
    const checklist = { ...snapshot.checklist, [key]: checked };
    try {
      const response = await fetch("/api/admin/operations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checklist }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kontrol listesi kaydedilemedi.");
      setSnapshot((current) => ({ ...current, checklist: data.checklist }));
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Kontrol listesi kaydedilemedi."); }
    finally { setSavingKey(""); }
  }

  useEffect(() => { const listener = () => { void refresh(); }; window.addEventListener("davetiye:backup-complete", listener); return () => window.removeEventListener("davetiye:backup-complete", listener); });

  const items = [
    { key: "backup", label: "Güncel şifreli yedeği indir", done: snapshot.backup.status === "current", automatic: true },
    { key: "album", label: "Ortak albüm bağlantısını ekle", done: snapshot.albumConfigured, automatic: true },
    { key: "duplicates", label: "Olası mükerrer kayıtları gözden geçir", done: snapshot.duplicatePairs === 0, automatic: true },
    { key: "maybe", label: "Henüz net olmayan yanıtları sonuçlandır", done: snapshot.maybeResponses === 0, automatic: true },
    { key: "maps_checked", label: "Harita bağlantılarını telefondan kontrol et", done: snapshot.checklist.maps_checked, automatic: false },
    { key: "qr_checked", label: "Masa QR kodunu gerçek bir telefonla okut", done: snapshot.checklist.qr_checked, automatic: false },
    { key: "second_device_login_checked", label: "Yönetici girişini ikinci bir cihazda dene", done: snapshot.checklist.second_device_login_checked, automatic: false },
  ];

  return <section className="admin-card operations-card">
    <div className="admin-card-heading"><div><h2>Sistem ve Düğün Günü Kontrolü</h2><p>Son kontrol: {date(snapshot.checkedAt)}</p></div><button className="record-action" type="button" onClick={refresh} disabled={refreshing}>{refreshing ? "Kontrol ediliyor…" : "Durumu Yenile"}</button></div>
    <div className="health-grid">
      <article className="health-item"><span className="health-dot ok" aria-hidden="true" /><div><strong>Veritabanı çalışıyor</strong><small>{snapshot.activeRsvps} LCV · {snapshot.guestTotal} katılımcı</small></div></article>
      <article className="health-item"><span className={`health-dot ${snapshot.invalidRecords === 0 ? "ok" : "warn"}`} aria-hidden="true" /><div><strong>{snapshot.invalidRecords === 0 ? "Veri bütünlüğü temiz" : `${snapshot.invalidRecords} sorunlu kayıt`}</strong><small>{snapshot.duplicatePairs} olası mükerrer eşleşme</small></div></article>
      <article className="health-item"><span className={`health-dot ${snapshot.backup.status === "current" ? "ok" : "warn"}`} aria-hidden="true" /><div><strong>{snapshot.backup.status === "current" ? "Yedek güncel" : "Yedek alınmalı"}</strong><small>Son yedek: {date(snapshot.lastBackupAt)}</small></div></article>
      <article className="health-item"><span className={`health-dot ${snapshot.failedLogins24h === 0 ? "ok" : "warn"}`} aria-hidden="true" /><div><strong>{snapshot.failedLogins24h === 0 ? "Şüpheli giriş yok" : `${snapshot.failedLogins24h} hatalı giriş`}</strong><small>Son 24 saat</small></div></article>
    </div>
    <div className="operations-summary"><span>Son form: {date(snapshot.lastSubmissionAt)}</span><span>{snapshot.activeMedia} galeri bağlantısı</span><span>{snapshot.trashCount} çöp kaydı</span></div>
    <div className="checklist-heading"><div><h3>Düğün günü kontrol listesi</h3><p>{progress.complete}/{progress.total} tamamlandı</p></div><div className="checklist-progress" aria-label={`Kontrol listesinin ${progress.complete}/${progress.total} maddesi tamamlandı`}><span style={{ width: `${progress.complete / progress.total * 100}%` }} /></div></div>
    <div className="operations-checklist">{items.map((item) => <label className={item.automatic ? "automatic" : ""} key={item.key}><input type="checkbox" checked={item.done} disabled={item.automatic || Boolean(savingKey)} onChange={(event) => void toggle(item.key, event.target.checked)} /><span>{item.label}<small>{item.automatic ? "Otomatik kontrol" : "Elle onay"}</small></span></label>)}</div>
    {feedback && <p className="form-feedback" role="status">{feedback}</p>}
  </section>;
}
