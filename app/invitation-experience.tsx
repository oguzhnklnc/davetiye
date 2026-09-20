"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Countdown } from "./countdown";
import { useFormRequest } from "./use-form-request";

const address = "Bahçelievler, Süleyman Demirel Caddesi No: 81, 32040 Merkez/Isparta";
const mapsQuery = encodeURIComponent(`Barida Hotel, ${address}`);
const googleCalendar = new URL("https://calendar.google.com/calendar/render");
googleCalendar.searchParams.set("action", "TEMPLATE");
googleCalendar.searchParams.set("text", "Özdil & Hüseyin Düğünü");
googleCalendar.searchParams.set("dates", "20261024T160000Z/20261024T205900Z");
googleCalendar.searchParams.set("details", "Mutluluğumuza eşlik etmeniz dileğiyle.");
googleCalendar.searchParams.set("location", `Barida Hotel, ${address}`);

const program = [
  { time: "19.00", title: "Nikâh Töreni", symbol: "◇", note: "Birlikteliğimize vereceğiniz sözü birlikte kutluyoruz." },
  { time: "20.00", title: "Yemek", symbol: "○", note: "Aynı sofrada buluşuyor, mutluluğumuzu paylaşıyoruz." },
  { time: "21.00", title: "Eğlence", symbol: "✦", note: "Müzik, dans ve güzel anılarla geceye devam ediyoruz." },
];

type Weather = { mode: "wedding" | "current"; title: string; summary: string; detail: string };

export function InvitationExperience() {
  const [programIndex, setProgramIndex] = useState(0);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [albumUrl, setAlbumUrl] = useState<string | null>(null);
  const programRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/weather").then((r) => r.json()).then(setWeather).catch(() => null);
    fetch("/api/settings").then((r) => r.json()).then((data) => setAlbumUrl(data.albumUrl ?? null)).catch(() => null);
  }, []);

  function goToProgram(index: number) {
    const el = programRef.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * index, behavior: "smooth" });
    setProgramIndex(index);
  }

  return (
    <main>
      <section className="hero" aria-labelledby="couple-names">
        <div className="grain" aria-hidden="true" />
        <div className="hero-leaf leaf-one" aria-hidden="true" />
        <div className="hero-leaf leaf-two" aria-hidden="true" />
        <div className="hero-inner">
          <p className="eyebrow">Evleniyoruz</p>
          <h1 id="couple-names"><span>Özdil</span><b>&amp;</b><span>Hüseyin</span></h1>
          <Ornament />
          <p className="hero-meta">24 Ekim 2026, Cumartesi</p>
          <p className="hero-place">Barida Hotel · Isparta</p>
          <Countdown target="2026-10-24T19:00:00+03:00" />
          <a className="details-link" href="#dugun-detaylari">Detayları gör <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section id="dugun-detaylari" className="section section-cream">
        <SectionHeading label="Ne zaman, nerede?" title="Düğün Detayları" />
        <div className="section-stack narrow">
          <article className="info-card date-card">
            <div className="round-icon" aria-hidden="true">24</div>
            <div><p className="card-label">Tarih &amp; Saat</p><h3>24 Ekim 2026 Cumartesi</h3><p>Tören saat 19.00&apos;da başlayacaktır.</p></div>
          </article>
          <article className="info-card hosts-card">
            <p className="card-label centered">Düğün Sahipleri</p>
            <div className="host-grid">
              <div><span className="host-mark" aria-hidden="true">Ö</span><h3>Selver Ailesi</h3><p>Dilek Selver<br />Özcan Selver</p></div>
              <div><span className="host-mark" aria-hidden="true">H</span><h3>Kılınç Ailesi</h3><p>Azime Kılınç<br />Abdullah Taner Kılınç</p></div>
            </div>
          </article>
          <article className="venue-card">
            <iframe title="Barida Hotel haritası" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${mapsQuery}&output=embed`} />
            <div className="venue-body">
              <div className="round-icon" aria-hidden="true">⌖</div>
              <div><p className="card-label">Mekân</p><h3>Barida Hotel</h3><p>Bahçelievler, Süleyman Demirel Caddesi No: 81,<br />32040 Merkez/Isparta</p></div>
            </div>
            <div className="button-row">
              <a className="button primary" href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noreferrer">Google Maps</a>
              <a className="button outline" href={`https://maps.apple.com/?q=${mapsQuery}`} target="_blank" rel="noreferrer">Apple Maps</a>
            </div>
          </article>

          <article className="program-card">
            <h3>Etkinlik Programı</h3><Ornament compact />
            <div className="program-slider" ref={programRef} onScroll={(e) => setProgramIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
              {program.map((item) => <div className="program-slide" key={item.time}><p className="program-time">{item.time}</p><div className="program-symbol" aria-hidden="true">{item.symbol}</div><h4>{item.title}</h4><p>{item.note}</p></div>)}
            </div>
            <div className="dots" aria-label="Program adımları">{program.map((item, index) => <button key={item.time} className={programIndex === index ? "active" : ""} onClick={() => goToProgram(index)} aria-label={`${item.title} bölümüne git`} />)}</div>
          </article>

          <article className="info-card utility-card">
            <div className="round-icon mustard" aria-hidden="true">☼</div>
            <div><p className="card-label">Isparta&apos;da Hava</p><h3>{weather?.title ?? "Hava durumu yükleniyor…"}</h3><p>{weather?.summary ?? "Güncel bilgiler alınıyor."}</p>{weather?.detail && <small>{weather.detail}</small>}</div>
          </article>

          <article className="info-card utility-card calendar-card">
            <div className="round-icon olive" aria-hidden="true">＋</div>
            <div className="utility-content"><p className="card-label">Unutmayın</p><h3>Takviminize ekleyin</h3><div className="button-row"><a className="button dark" href="/api/calendar">.ics indir</a><a className="button outline dark-outline" href={googleCalendar.toString()} target="_blank" rel="noreferrer">Google Takvim</a></div></div>
          </article>
        </div>
      </section>

      <RsvpSection />
      <MemoriesSection albumUrl={albumUrl} />

      <footer><p className="eyebrow">24 Ekim 2026</p><h2>Özdil <i>&amp;</i> Hüseyin</h2><p>Bu özel günümüzde yanımızda olmanız dileğiyle.</p><a href="#" aria-label="Sayfanın başına dön">Yukarı dön ↑</a></footer>
    </main>
  );
}

function RsvpSection() {
  const [status, setStatus] = useState("attending");
  const [guestCount, setGuestCount] = useState(1);
  const { sending, feedback, send } = useFormRequest(true);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const ok = await send("/api/rsvp", { name: form.get("name"), status, guestCount: status === "attending" ? guestCount : 0, note: form.get("note"), website: form.get("website") }, "Katılım bildiriminiz alındı. Teşekkür ederiz.");
    if (ok) { element.reset(); setStatus("attending"); setGuestCount(1); }
  }

  return <section id="katilim" className="section rsvp-section"><SectionHeading label="Katılım Bildirimi" title="Mutlu Günümüzde Bize Eşlik Edecek misiniz?" light /><p className="section-intro light-text">Basılı davetiye göndermiyoruz; lütfen katılımınızı bu formdan bildirin.</p><form className="form-card" onSubmit={submit}><fieldset className="submission-fields" disabled={sending}><label>Adınız Soyadınız<input name="name" placeholder="Ad Soyad" autoComplete="name" required maxLength={100} /></label><fieldset><legend>Katılım Durumu (LCV)</legend>{[["attending","✓","Katılıyorum"],["maybe","?","Henüz net değil"],["declined","×","Katılamayacağım"]].map(([value,symbol,label]) => <button type="button" key={value} onClick={() => setStatus(value)} className={`choice ${status === value ? `selected ${value}` : ""}`}><span>{symbol}</span>{label}</button>)}</fieldset>{status === "attending" && <div className="guest-picker"><p>Kişi Sayısı (Siz Dâhil)</p><div><button type="button" onClick={() => setGuestCount(Math.max(1, guestCount - 1))} aria-label="Kişi sayısını azalt">−</button><strong>{guestCount}</strong><button type="button" onClick={() => setGuestCount(guestCount + 1)} aria-label="Kişi sayısını artır">+</button></div></div>}<label>Not (Opsiyonel)<textarea name="note" placeholder="Alerji, özel bir dilek veya iletmek istediğiniz bir not…" maxLength={500} /></label><input className="honeypot" name="website" tabIndex={-1} autoComplete="off" /><p className="privacy-note">Paylaştığınız bilgiler yalnızca düğün organizasyonu ve katılım planlaması amacıyla kullanılacaktır.</p><button className="submit-button" disabled={sending}>{sending ? "Gönderiliyor…" : "Katılım Bildirimini Gönder"}</button></fieldset>{feedback && <p className="form-feedback" role="status">{feedback}</p>}</form></section>;
}

function MemoriesSection({ albumUrl }: { albumUrl: string | null }) {
  const { sending, feedback, send } = useFormRequest(true);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const ok = await send("/api/memories", { name: form.get("name"), url: form.get("url"), website: form.get("website") }, "Bağlantınız bize ulaştı. Teşekkür ederiz.");
    if (ok) element.reset();
  }
  return <section id="anilar" className="section section-cream memories"><SectionHeading label="Anılar" title="Fotoğraf & Video Paylaşın" /><p className="section-intro">Düğün günü çektiğiniz kareleri bizimle paylaşın. Ortak albüme ulaşabilir veya kendi galerinizin bağlantısını gönderebilirsiniz.</p><div className="section-stack narrow">{albumUrl ? <a className="album-card" href={albumUrl} target="_blank" rel="noreferrer"><span aria-hidden="true">▣</span><div><h3>Ortak albümü açın</h3><p>Fotoğraf ve videoları görüntüleyin ya da albüme ekleyin.</p></div></a> : <div className="empty-album"><span aria-hidden="true">□</span><p>Ortak albüm bağlantısı henüz eklenmedi.<br />Düğün günü burada yerini alacak.</p></div>}<form className="link-form" onSubmit={submit}><fieldset className="submission-fields" disabled={sending}><h3>Kendi galerinizin bağlantısını gönderin</h3><input name="name" placeholder="Adınız" required maxLength={100} /><input name="url" type="url" placeholder="Google Fotoğraflar / Drive bağlantısı" required /><input className="honeypot" name="website" tabIndex={-1} autoComplete="off" /><p className="privacy-note">Adınız ve gönderdiğiniz bağlantı yalnızca düğün anılarını toplamak amacıyla kullanılacaktır.</p><button className="submit-button" disabled={sending}>{sending ? "Gönderiliyor…" : "Bağlantıyı Gönder"}</button></fieldset>{feedback && <p className="form-feedback" role="status">{feedback}</p>}</form><div className="qr-card"><img src="/api/qr" width="168" height="168" alt="Anılar bölümüne yönlendiren QR kod" /><div><p className="card-label">Masanızdan okutun</p><h3>Anılarımızı birlikte biriktirelim</h3><p>Bu QR kod bütün masalarda kullanılabilir; okuttuğunuzda doğrudan paylaşım bölümüne gelirsiniz.</p></div></div></div></section>;
}

function SectionHeading({ label, title, light = false }: { label: string; title: string; light?: boolean }) { return <header className={`section-heading ${light ? "light" : ""}`}><div><i /><span>{label}</span><i /></div><h2>{title}</h2></header>; }
function Ornament({ compact = false }: { compact?: boolean }) { return <div className={`flourish ${compact ? "compact" : ""}`} aria-hidden="true"><i /><span>◆</span><i /></div>; }
