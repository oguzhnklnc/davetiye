"use client";

import { FormEvent } from "react";
import Link from "next/link";
import { useFormRequest } from "@/app/use-form-request";

export function LoginForm() {
  const { feedback, sending, send } = useFormRequest();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (await send("/api/admin/login", { username: form.get("username"), password: form.get("password") }, "Giriş başarılı.")) window.location.replace("/yonetim");
  }

  return <main className="admin-login"><form onSubmit={submit}><p className="eyebrow dark">Özdil &amp; Hüseyin</p><h1>Yönetici Girişi</h1><p>Katılım bildirimlerini görmek için giriş yapın.</p><label>Kullanıcı adı<input name="username" autoComplete="username" required /></label><label>Parola<input name="password" type="password" autoComplete="current-password" required /></label><button className="submit-button" disabled={sending}>{sending ? "Giriş yapılıyor…" : "Giriş Yap"}</button>{feedback && <p className="login-error" role="alert">{feedback}</p>}<Link href="/">Davetiyeye dön</Link></form></main>;
}

export function LogoutButton() {
  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); window.location.replace("/"); }
  return <button type="button" onClick={logout}>Çıkış yap</button>;
}
