import { isAdminAuthenticated } from "@/app/admin-auth";
import { ensureSchema, getDatabase } from "@/db/runtime";
import { AdminControls } from "./admin-controls";
import { LoginForm, LogoutButton } from "./login-form";
import { DeleteRecordButton } from "./delete-record-button";
import { BackupControls } from "./backup-controls";

export const dynamic = "force-dynamic";

type Rsvp = { id: string; name: string; status: "attending" | "maybe" | "declined"; guest_count: number; note: string; created_at: string; deleted_at: string | null };
type MediaLink = { id: string; name: string; url: string; created_at: string; deleted_at: string | null };

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) return <LoginForm />;

  await ensureSchema();
  const db = getDatabase();
  const [rsvpResult, mediaResult, setting] = await Promise.all([
    db.prepare("SELECT id, name, status, guest_count, note, created_at, deleted_at FROM rsvps ORDER BY created_at DESC").all<Rsvp>(),
    db.prepare("SELECT id, name, url, created_at, deleted_at FROM media_links ORDER BY created_at DESC").all<MediaLink>(),
    db.prepare("SELECT value FROM settings WHERE key = ?").bind("album_url").first<{ value: string }>(),
  ]);
  const rsvps = rsvpResult.results.filter((item) => !item.deleted_at);
  const media = mediaResult.results.filter((item) => !item.deleted_at);
  const deletedRsvps = rsvpResult.results.filter((item) => item.deleted_at);
  const deletedMedia = mediaResult.results.filter((item) => item.deleted_at);
  const attending = rsvps.filter((item) => item.status === "attending");
  const maybe = rsvps.filter((item) => item.status === "maybe");
  const declined = rsvps.filter((item) => item.status === "declined");
  const guestTotal = attending.reduce((sum, item) => sum + item.guest_count, 0);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div><p className="eyebrow dark">Özdil &amp; Hüseyin</p><h1>Yönetici Paneli</h1><p>Hoş geldiniz.</p></div>
        <div className="admin-actions"><a href="/">Davetiyeyi aç</a><LogoutButton /></div>
      </header>
      <section className="stat-grid">
        <article><span>Toplam katılımcı</span><strong>{guestTotal}</strong></article>
        <article><span>Katılıyorum</span><strong>{attending.length}</strong></article>
        <article><span>Henüz net değil</span><strong>{maybe.length}</strong></article>
        <article><span>Katılamayacak</span><strong>{declined.length}</strong></article>
      </section>
      <AdminControls albumUrl={setting?.value ?? ""} />
      <BackupControls />
      <section className="admin-card">
        <div className="admin-card-heading"><div><h2>Katılım Bildirimleri</h2><p>{rsvps.length} form yanıtı</p></div><a className="button outline dark-outline compact-button" href="/api/admin/export">CSV indir</a></div>
        {rsvps.length ? <div className="table-wrap"><table><thead><tr><th>Ad Soyad</th><th>Durum</th><th>Kişi</th><th>Not</th><th>Tarih</th><th>İşlem</th></tr></thead><tbody>{rsvps.map((item) => <tr key={item.id}><td>{item.name}</td><td><span className={`status-pill ${item.status}`}>{item.status === "attending" ? "Katılıyor" : item.status === "maybe" ? "Henüz net değil" : "Katılamıyor"}</span></td><td>{item.status === "attending" ? item.guest_count : "—"}</td><td>{item.note || "—"}</td><td>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(item.created_at))}</td><td><DeleteRecordButton id={item.id} type="rsvp" label={item.name} /></td></tr>)}</tbody></table></div> : <p className="empty-state">Henüz katılım bildirimi bulunmuyor.</p>}
      </section>
      <section className="admin-card trash-card">
        <div className="admin-card-heading"><div><h2>Çöp Kutusu</h2><p>{deletedRsvps.length + deletedMedia.length} kayıt · yedeklere dâhildir</p></div></div>
        {deletedRsvps.length + deletedMedia.length ? <div className="trash-list">
          {deletedRsvps.map((item) => <div className="trash-row" key={item.id}><div><strong>{item.name}</strong><span>LCV · {item.status === "attending" ? "Katılıyor" : item.status === "maybe" ? "Henüz net değil" : "Katılamıyor"}</span></div><DeleteRecordButton id={item.id} type="rsvp" label={item.name} restore /></div>)}
          {deletedMedia.map((item) => <div className="trash-row" key={item.id}><div><strong>{item.name}</strong><span>Galeri bağlantısı</span></div><DeleteRecordButton id={item.id} type="memory" label={item.name} restore /></div>)}
        </div> : <p className="empty-state">Çöp kutusu boş.</p>}
      </section>
      <section className="admin-card">
        <div className="admin-card-heading"><div><h2>Gönderilen Galeri Bağlantıları</h2><p>{media.length} bağlantı</p></div></div>
        {media.length ? <div className="media-list">{media.map((item) => <div className="media-row" key={item.id}><a href={item.url} target="_blank" rel="noreferrer"><div><strong>{item.name}</strong><span>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(item.created_at))}</span></div><b>Bağlantıyı aç ↗</b></a><DeleteRecordButton id={item.id} type="memory" label={item.name} /></div>)}</div> : <p className="empty-state">Henüz galeri bağlantısı gönderilmedi.</p>}
      </section>
    </main>
  );
}
