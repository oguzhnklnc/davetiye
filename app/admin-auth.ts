import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { createAdminSessionToken, verifyAdminSessionToken } from "@/app/admin-session.mjs";
import { getAdminSessionVersion } from "@/db/admin-session.mjs";
import { ensureSchema, getDatabase } from "@/db/runtime";

const SESSION_SECONDS = 4 * 60 * 60;
type AuthEnv = { ADMIN_USERNAME?: string; ADMIN_PASSWORD?: string; ADMIN_AUTH_SECRET?: string };

function credentials() {
  const values = env as unknown as AuthEnv;
  return { username: values.ADMIN_USERNAME ?? "", password: values.ADMIN_PASSWORD ?? "", secret: values.ADMIN_AUTH_SECRET ?? "" };
}

function cookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-davetiye_admin" : "davetiye_admin";
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function safeEqual(left: string, right: string) {
  const [a, b] = await Promise.all([digest(left), digest(right)]);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function verifyAdminCredentials(username: string, password: string) {
  const configured = credentials();
  if (!configured.username || !configured.password || !configured.secret) return false;
  const [usernameMatches, passwordMatches] = await Promise.all([safeEqual(username, configured.username), safeEqual(password, configured.password)]);
  return usernameMatches && passwordMatches;
}

export async function createAdminSession() {
  const configured = credentials();
  if (!configured.secret || !configured.username) throw new Error("Yönetici ayarları eksik.");
  await ensureSchema();
  const version = await getAdminSessionVersion(getDatabase());
  const token = await createAdminSessionToken({ username: configured.username, secret: configured.secret, version, ttlSeconds: SESSION_SECONDS });
  const cookieStore = await cookies();
  cookieStore.set(cookieName(), token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_SECONDS });
}

export async function isAdminAuthenticated() {
  const configured = credentials();
  if (!configured.secret || !configured.username) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName())?.value;
  if (!token) return false;
  try {
    await ensureSchema();
    const version = await getAdminSessionVersion(getDatabase());
    return verifyAdminSessionToken({ token, username: configured.username, secret: configured.secret, version });
  } catch { return false; }
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(cookieName(), "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}
