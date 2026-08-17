import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

const COOKIE_NAME = "davetiye_admin";
const SESSION_SECONDS = 8 * 60 * 60;
type AuthEnv = { ADMIN_USERNAME?: string; ADMIN_PASSWORD?: string; ADMIN_AUTH_SECRET?: string };

function credentials() {
  const values = env as unknown as AuthEnv;
  return { username: values.ADMIN_USERNAME ?? "", password: values.ADMIN_PASSWORD ?? "", secret: values.ADMIN_AUTH_SECRET ?? "" };
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

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function signature(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
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
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${configured.username}:${expires}`;
  const token = `${expires}.${await signature(payload, configured.secret)}`;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_SECONDS });
}

export async function isAdminAuthenticated() {
  const configured = credentials();
  if (!configured.secret || !configured.username) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const [expiresText, suppliedSignature] = token.split(".");
  const expires = Number(expiresText);
  if (!suppliedSignature || !Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  const expected = await signature(`${configured.username}:${expires}`, configured.secret);
  return safeEqual(suppliedSignature, expected);
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}
