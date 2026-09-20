const DEFAULT_TTL_SECONDS = 4 * 60 * 60;

export function adminSessionSigningSecret(authSecret, password) {
  return `${String(authSecret).length}:${authSecret}:${String(password).length}:${password}`;
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function signature(payload, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}

async function safeEqual(left, right) {
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(left)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(right)),
  ]);
  const leftBytes = new Uint8Array(a); const rightBytes = new Uint8Array(b);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}

export async function createAdminSessionToken({ username, secret, version, now = Math.floor(Date.now() / 1000), ttlSeconds = DEFAULT_TTL_SECONDS }) {
  const expires = now + ttlSeconds;
  const payload = `${username}:${expires}:${version}`;
  return `${expires}.${version}.${await signature(payload, secret)}`;
}

export async function verifyAdminSessionToken({ token, username, secret, version, now = Math.floor(Date.now() / 1000) }) {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 3) return false;
  const [expiresText, suppliedVersion, suppliedSignature] = parts;
  const expires = Number(expiresText);
  if (!suppliedSignature || !Number.isSafeInteger(expires) || expires <= now || suppliedVersion !== version) return false;
  const expected = await signature(`${username}:${expires}:${version}`, secret);
  return safeEqual(suppliedSignature, expected);
}
