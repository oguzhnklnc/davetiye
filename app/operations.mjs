export const WEDDING_TIME = "2026-10-24T19:00:00+03:00";
export const MANUAL_CHECKLIST_KEYS = [
  "maps_checked",
  "qr_checked",
  "calendar_checked",
  "live_forms_checked",
  "iphone_safari_checked",
  "android_chrome_checked",
  "second_device_login_checked",
];

export function parseChecklist(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    return Object.fromEntries(MANUAL_CHECKLIST_KEYS.map((key) => [key, parsed?.[key] === true]));
  } catch {
    return Object.fromEntries(MANUAL_CHECKLIST_KEYS.map((key) => [key, false]));
  }
}

export function backupHealth(lastBackupAt, now = Date.now()) {
  if (!lastBackupAt) return { status: "missing", maxAgeDays: 7 };
  const wedding = Date.parse(WEDDING_TIME);
  const maxAgeDays = wedding - now <= 7 * 86_400_000 ? 1 : 7;
  const age = now - Date.parse(lastBackupAt);
  if (!Number.isFinite(age) || age < 0) return { status: "attention", maxAgeDays };
  return { status: age <= maxAgeDays * 86_400_000 ? "current" : "attention", maxAgeDays };
}

export function checklistProgress(snapshot) {
  const automatic = [snapshot.backup.status === "current", snapshot.albumConfigured, snapshot.duplicatePairs === 0, snapshot.maybeResponses === 0];
  const manual = MANUAL_CHECKLIST_KEYS.map((key) => snapshot.checklist[key] === true);
  const complete = [...automatic, ...manual].filter(Boolean).length;
  return { complete, total: automatic.length + manual.length };
}
