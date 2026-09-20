import { env } from "cloudflare:workers";
import { ensureSchema, getDatabase } from "@/db/runtime";
import { evaluateRateLimit, isSameOriginRequest } from "@/app/security-policy.mjs";
import { getVisitorIdentity } from "@/app/visitor-identity.mjs";

export { isSameOriginRequest } from "@/app/security-policy.mjs";

type SecurityEnv = { ADMIN_AUTH_SECRET?: string };

const encoder = new TextEncoder();

function securitySecret() {
  return (env as unknown as SecurityEnv).ADMIN_AUTH_SECRET ?? "";
}

export function getSubmissionIdentity(request: Request) {
  return getVisitorIdentity(request, securitySecret(), { secure: process.env.NODE_ENV === "production" });
}

export function rejectCrossOriginRequest(request: Request) {
  if (isSameOriginRequest(request)) return null;
  return Response.json({ error: "Geçersiz istek kaynağı." }, { status: 403, headers: { "Cache-Control": "no-store" } });
}

function clientAddress(request: Request) {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
}

async function fingerprint(request: Request) {
  const secret = securitySecret();
  if (!secret) throw new Error("Güvenlik anahtarı yapılandırılmamış.");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(clientAddress(request))));
  return Array.from(signature.slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getRequestLimit(request: Request, eventType: string, limit: number, windowSeconds: number) {
  await ensureSchema();
  const visitor = await fingerprint(request);
  const now = Date.now();
  const cutoff = new Date(now - windowSeconds * 1000).toISOString();
  const row = await getDatabase().prepare(
    "SELECT COUNT(*) AS count, MIN(created_at) AS oldest FROM security_events WHERE event_type = ? AND fingerprint = ? AND created_at >= ?",
  ).bind(eventType, visitor, cutoff).first<{ count: number; oldest: string | null }>();
  const decision = evaluateRateLimit({ count: Number(row?.count ?? 0), oldest: row?.oldest ?? null, now, limit, windowSeconds });
  return { ...decision, fingerprint: visitor };
}

export async function recordSecurityEvent(eventType: string, visitor: string) {
  await ensureSchema();
  const db = getDatabase();
  const now = new Date().toISOString();
  const retentionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.batch([
    db.prepare("DELETE FROM security_events WHERE created_at < ?").bind(retentionCutoff),
    db.prepare("INSERT INTO security_events (id, event_type, fingerprint, created_at) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), eventType, visitor, now),
  ]);
}

export async function recordRequestSecurityEvent(request: Request, eventType: string) {
  await recordSecurityEvent(eventType, await fingerprint(request));
}

export function rateLimitResponse(retryAfter: number) {
  return Response.json(
    { error: "Çok fazla deneme yapıldı. Lütfen bir süre sonra yeniden deneyin." },
    { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(retryAfter) } },
  );
}
