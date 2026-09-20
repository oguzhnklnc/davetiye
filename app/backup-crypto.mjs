import { BACKUP_LIMIT, validateBackup } from "./backup-format.mjs";

const encoder = new TextEncoder();
const iterations = 600000;
function base64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function bytes(value) {
  if (typeof value !== "string") throw new Error("Geçersiz şifreli yedek.");
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
async function key(password, salt, usage) {
  if (typeof password !== "string" || password.length < 12 || password.length > 256) throw new Error("Yedek parolası 12–256 karakter olmalıdır.");
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, [usage]);
}
export async function encryptBackup(backup, password) {
  const data = encoder.encode(JSON.stringify(validateBackup(backup)));
  if (data.length > BACKUP_LIMIT) throw new Error("Yedek 5 MB sınırını aşıyor.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(password, salt, "encrypt"), data);
  return JSON.stringify({ format: "davetiye-encrypted", version: 1, algorithm: "AES-256-GCM", kdf: "PBKDF2-SHA256", iterations, salt: base64(salt), iv: base64(iv), ciphertext: base64(new Uint8Array(ciphertext)) });
}
export async function decryptBackup(encrypted, password) {
  if (typeof encrypted !== "string" || encrypted.length > BACKUP_LIMIT * 1.5) throw new Error("Yedek dosyası çok büyük.");
  try {
    const data = JSON.parse(encrypted);
    if (data.format !== "davetiye-encrypted" || data.version !== 1 || data.algorithm !== "AES-256-GCM" || data.kdf !== "PBKDF2-SHA256" || data.iterations !== iterations) throw new Error();
    const salt = bytes(data.salt), iv = bytes(data.iv), ciphertext = bytes(data.ciphertext);
    if (salt.length !== 16 || iv.length !== 12 || ciphertext.length > BACKUP_LIMIT + 16) throw new Error();
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await key(password, salt, "decrypt"), ciphertext);
    return validateBackup(JSON.parse(new TextDecoder().decode(plain)));
  } catch {
    throw new Error("Yedek açılamadı. Parola yanlış veya dosya bozulmuş olabilir.");
  }
}
