const lifetime = 7 * 24 * 60 * 60;
const encoder = new TextEncoder();
const hex = (bytes) => Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");

/** An anonymous browser identity, not authentication or proof of a person. */
export async function getVisitorIdentity(request, secret, { secure = true, now = Math.floor(Date.now() / 1000) } = {}) {
  if (!secret) throw new Error("Visitor signing secret is missing");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  const sign = async (value) => hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  const name = secure ? "__Host-davetiye_visitor" : "davetiye_visitor";
  const token = (request.headers.get("cookie") ?? "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(\d{10})\.([0-9a-f]{64})$/.exec(token);
  let id;
  if (match && Number(match[2]) > now && Number(match[2]) <= now + lifetime) {
    const signature = new Uint8Array(match[3].match(/../g).map((byte) => parseInt(byte, 16)));
    if (await crypto.subtle.verify("HMAC", key, signature, encoder.encode(`visitor-cookie:${match[1]}.${match[2]}`))) id = match[1];
  }
  let setCookie;
  if (!id) {
    id = crypto.randomUUID();
    const payload = `${id}.${now + lifetime}`;
    const signed = `${payload}.${await sign(`visitor-cookie:${payload}`)}`;
    setCookie = `${name}=${signed}; Path=/; Max-Age=${lifetime}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
  }
  return {
    fingerprint: (await sign(`visitor-id:${id}`)).slice(0, 32),
    // Only Cloudflare's trusted address header is used. Never trust caller-supplied X-Forwarded-For.
    networkFingerprint: (await sign(request.headers.get("cf-connecting-ip") ?? "unknown")).slice(0, 32),
    respond(response) {
      response.headers.set("Cache-Control", "no-store");
      if (setCookie) response.headers.append("Set-Cookie", setCookie);
      return response;
    },
  };
}
