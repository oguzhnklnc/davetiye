"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true); setFeedback("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
    if (response.ok) window.location.replace("/yonetim");
    else { const data = await response.json().catch(() => ({})); setFeedback(data.error ?? "Kullanıcı adı veya parola hatalı."); setSending(false); }
  }

  return <main className="admin-login"><form onSubmit={submit}><p className="eyebrow dark">Özdil &amp; Hüseyin</p><h1>Yönetici Girişi</h1><p>Katılım bildirimlerini görmek için giriş yapın.</p><label>Kullanıcı adı<input name="username" autoComplete="username" required autoFocus /></label><label>Parola<input name="password" type="password" autoComplete="current-password" required /></label><button className="submit-button" disabled={sending}>{sending ? "Giriş yapılıyor…" : "Giriş Yap"}</button>{feedback && <p className="login-error" role="alert">{feedback}</p>}<a href="/">Davetiyeye dön</a></form></main>;
}

export function LogoutButton() {
  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); window.location.replace("/"); }
  return <button type="button" onClick={logout}>Çıkış yap</button>;
}
