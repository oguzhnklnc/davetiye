import { isAdminAuthenticated } from "@/app/admin-auth";
import Link from "next/link";
import { ensureSchema, getDatabase } from "@/db/runtime";
import { AdminControls } from "./admin-controls";
import { LoginForm, LogoutButton } from "./login-form";
import { DeleteRecordButton } from "./delete-record-button";
import { BackupControls } from "./backup-controls";
import { SecurityControls } from "./security-controls";
import { EditRsvpButton } from "./edit-rsvp-button";
import { MergeRsvpButton } from "./merge-rsvp-button";
import { findPotentialDuplicatePairs } from "@/app/duplicate-rsvps.mjs";
import { getOperationalSnapshot } from "@/db/operations.mjs";
import { OperationsPanel } from "./operations-panel";

export const dynamic = "force-dynamic";

type Rsvp = { id: string; name: string; status: "attending" | "maybe" | "declined"; guest_count: number; note: string; created_at: string; deleted_at: string | null };
type MediaLink = { id: string; name: string; url: string; created_at: string; deleted_at: string | null };

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) return <LoginForm />;

  await ensureSchema();
  const db = getDatabase();
  const [rsvpResult, mediaResult, setting, operationalSnapshot] = await Promise.all([
    db.prepare("SELECT id, name, status, guest_count, note, created_at, deleted_at FROM rsvps ORDER BY created_at DESC").all<Rsvp>(),
    db.prepare("SELECT id, name, url, created_at, deleted_at FROM media_links ORDER BY created_at DESC").all<MediaLink>(),
    db.prepare("SELECT value FROM settings WHERE key = ?").bind("album_url").first<{ value: string }>(),
    getOperationalSnapshot(db),
  ]);
  const rsvps = rsvpResult.results.filter((item) => !item.deleted_at);
  const media = mediaResult.results.filter((item) => !item.deleted_at);
  const deletedRsvps = rsvpResult.results.filter((item) => item.deleted_at);
  const deletedMedia = mediaResult.results.filter((item) => item.deleted_at);
  const attending = rsvps.filter((item) => item.status === "attending");
  const maybe = rsvps.filter((item) => item.status === "maybe");
  const declined = rsvps.filter((item) => item.status === "declined");
  const guestTotal = attending.reduce((sum, item) => sum + item.guest_count, 0);
  const duplicatePairs = findPotentialDuplicatePairs(rsvps) as [Rsvp, Rsvp][];

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div><p className="eyebrow dark">Özdil &amp; Hüseyin</p><h1>Yönetici Paneli</h1><p>Hoş geldiniz.</p></div>
        <div className="admin-actions"><Link href="/">Davetiyeyi aç</Link><LogoutButton /></div>
      </header>
      <section className="stat-grid">
        <article><span>Toplam katılımcı</span><strong>{guestTotal}</strong></article>
        <article><span>Katılıyorum</span><strong>{attending.length}</strong></article>
        <article><span>Henüz net değil</span><strong>{maybe.length}</strong></article>
        <article><span>Katılamayacak</span><strong>{declined.length}</strong></article>
      </section>
      <OperationsPanel initialSnapshot={operationalSnapshot} />
      <AdminControls albumUrl={setting?.value ?? ""} />
      <BackupControls />
      <SecurityControls />
      {duplicatePairs.length > 0 && <section className="admin-card duplicate-card">
        <div className="admin-card-heading"><div><h2>Olası Mükerrer Kayıtlar</h2><p>{duplicatePairs.length} eşleşme · birleştirme kararı size aittir</p></div></div>
        <div className="duplicate-list">{duplicatePairs.map(([first, second]) => <article className="duplicate-pair" key={`${first.id}-${second.id}`}>
          {[first, second].map((item, index) => { const other = index === 0 ? second : first; return <div className="duplicate-option" key={item.id}><div><strong>{item.name}</strong><span>{item.status === "attending" ? `${item.guest_count} kişi · Katılıyor` : item.status === "maybe" ? "Henüz net değil" : "Katılamıyor"}</span><small>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(item.created_at))}</small></div><MergeRsvpButton keepId={item.id} keepName={item.name} removeId={other.id} removeName={other.name} /></div>; })}
        </article>)}</div>
      </section>}
      <section className="admin-card">
        <div className="admin-card-heading"><div><h2>Katılım Bildirimleri</h2><p>{rsvps.length} form yanıtı</p></div><a className="button outline dark-outline compact-button" href="/api/admin/export">CSV indir</a></div>
        {rsvps.length ? <div className="table-wrap"><table><thead><tr><th>Ad Soyad</th><th>Durum</th><th>Kişi</th><th>Not</th><th>Tarih</th><th>İşlem</th></tr></thead><tbody>{rsvps.map((item) => <tr key={item.id}><td>{item.name}</td><td><span className={`status-pill ${item.status}`}>{item.status === "attending" ? "Katılıyor" : item.status === "maybe" ? "Henüz net değil" : "Katılamıyor"}</span></td><td>{item.status === "attending" ? item.guest_count : "—"}</td><td>{item.note || "—"}</td><td>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(item.created_at))}</td><td><div className="record-actions"><EditRsvpButton rsvp={item} /><DeleteRecordButton id={item.id} type="rsvp" label={item.name} /></div></td></tr>)}</tbody></table></div> : <p className="empty-state">Henüz katılım bildirimi bulunmuyor.</p>}
      </section>
      <section className="admin-card trash-card">
        <div className="admin-card-heading"><div><h2>Çöp Kutusu</h2><p>{deletedRsvps.length + deletedMedia.length} kayıt · kalıcı silme geri alınamaz</p></div></div>
        {deletedRsvps.length + deletedMedia.length ? <div className="trash-list">
          {deletedRsvps.map((item) => <div className="trash-row" key={item.id}><div><strong>{item.name}</strong><span>LCV · {item.status === "attending" ? "Katılıyor" : item.status === "maybe" ? "Henüz net değil" : "Katılamıyor"}</span></div><div className="record-actions"><DeleteRecordButton id={item.id} type="rsvp" label={item.name} restore /><DeleteRecordButton id={item.id} type="rsvp" label={item.name} permanent /></div></div>)}
          {deletedMedia.map((item) => <div className="trash-row" key={item.id}><div><strong>{item.name}</strong><span>Galeri bağlantısı</span></div><div className="record-actions"><DeleteRecordButton id={item.id} type="memory" label={item.name} restore /><DeleteRecordButton id={item.id} type="memory" label={item.name} permanent /></div></div>)}
        </div> : <p className="empty-state">Çöp kutusu boş.</p>}
      </section>
      <section className="admin-card">
        <div className="admin-card-heading"><div><h2>Gönderilen Galeri Bağlantıları</h2><p>{media.length} bağlantı</p></div></div>
        {media.length ? <div className="media-list">{media.map((item) => <div className="media-row" key={item.id}><a href={item.url} target="_blank" rel="noreferrer"><div><strong>{item.name}</strong><span>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(item.created_at))}</span></div><b>Bağlantıyı aç ↗</b></a><DeleteRecordButton id={item.id} type="memory" label={item.name} /></div>)}</div> : <p className="empty-state">Henüz galeri bağlantısı gönderilmedi.</p>}
      </section>
    </main>
  );
}
