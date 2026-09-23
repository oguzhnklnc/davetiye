export async function GET() {
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ozdil Huseyin//Dugun Davetiyesi//TR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT", "UID:ozdil-huseyin-20261024@davetiye", "DTSTAMP:20260817T000000Z", "DTSTART;TZID=Europe/Istanbul:20261024T190000", "DTEND;TZID=Europe/Istanbul:20261024T235900", "SUMMARY:Özdil & Hüseyin Düğünü", "DESCRIPTION:Mutluluğumuza eşlik etmeniz dileğiyle.", "LOCATION:Barida Hotel\\, Bahçelievler\\, Süleyman Demirel Caddesi No:81\\, Merkez/Isparta", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return new Response(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": "attachment; filename=ozdil-huseyin-dugunu.ics" } });
}
