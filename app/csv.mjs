export function csvCell(value) {
  let text = String(value ?? "").replaceAll("\0", "");
  if (/^[\t\r\n ]*[=+\-@]/.test(text) || /^[\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
