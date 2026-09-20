export const BACKUP_LIMIT = 5 * 1024 * 1024;
export const BACKUP_SITE = "ozdil-huseyin-20261024";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const mediaHosts = new Set(["photos.app.goo.gl", "photos.google.com", "drive.google.com", "docs.google.com"]);
const fail = () => { throw new Error("Yedek dosyasının biçimi veya içeriği geçersiz."); };
function text(value, min, max) {
  if (typeof value !== "string" || value.length < min || value.length > max) fail();
  return value;
}
function date(value) {
  text(value, 20, 35);
  if (!Number.isFinite(Date.parse(value))) fail();
  return value;
}
function link(value, media = false) {
  text(value, 1, 10000);
  let url;
  try { url = new URL(value); } catch { fail(); }
  if (url.protocol !== "https:" || (media && !mediaHosts.has(url.hostname))) fail();
  return value;
}
function rows(value, validate, max = 10000) {
  if (!Array.isArray(value) || value.length > max) fail();
  const ids = new Set();
  return value.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) fail();
    const clean = validate(row);
    const id = clean.id ?? clean.key;
    if (ids.has(id)) fail();
    ids.add(id);
    return clean;
  });
}
function common(row) {
  if (typeof row.id !== "string" || !uuid.test(row.id)) fail();
  return { id: row.id, name: text(row.name, 2, 100), created_at: date(row.created_at), deleted_at: row.deleted_at == null ? null : date(row.deleted_at) };
}

function checklist(value) {
  text(value, 2, 500);
  let parsed;
  try { parsed = JSON.parse(value); } catch { fail(); }
  const keys = ["maps_checked", "qr_checked", "second_device_login_checked"];
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).some((key) => !keys.includes(key))) fail();
  if (keys.some((key) => typeof parsed[key] !== "boolean")) fail();
  return JSON.stringify(Object.fromEntries(keys.map((key) => [key, parsed[key]])));
}

export function validateBackup(value) {
  if (!value || value.format !== "davetiye-backup" || value.version !== 1 || value.site !== BACKUP_SITE) fail();
  return {
    format: "davetiye-backup", version: 1, site: BACKUP_SITE, exported_at: date(value.exported_at),
    rsvps: rows(value.rsvps, (row) => {
      if (!["attending", "maybe", "declined"].includes(row.status)) fail();
      if (!Number.isSafeInteger(row.guest_count) || row.guest_count < 0 || (row.status === "attending" ? row.guest_count < 1 : row.guest_count !== 0)) fail();
      return { ...common(row), status: row.status, guest_count: row.guest_count, note: text(row.note, 0, 500) };
    }),
    media_links: rows(value.media_links, (row) => ({ ...common(row), url: link(row.url, true) })),
    settings: rows(value.settings, (row) => {
      if (!['album_url', 'operations_checklist'].includes(row.key)) fail();
      return { key: row.key, value: row.key === "album_url" ? link(row.value) : checklist(row.value), updated_at: date(row.updated_at) };
    }, 2),
  };
}

export function backupSummary(backup) {
  return { rsvps: backup.rsvps.length, media: backup.media_links.length, settings: backup.settings.length,
    trash: [...backup.rsvps, ...backup.media_links].filter((row) => row.deleted_at !== null).length };
}
