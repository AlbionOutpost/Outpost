// RFC 5545 text escaping and UTF-8 octet line folding. No arbitrary HTML or URL interpolation.
export function calendarText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
function fold(line: string) {
  const parts: string[] = [];
  let current = "",
    bytes = 0;
  for (const char of line) {
    const n = Buffer.byteLength(char, "utf8");
    if (bytes + n > 75) {
      parts.push(current);
      current = " " + char;
      bytes = 1 + n;
    } else {
      current += char;
      bytes += n;
    }
  }
  parts.push(current);
  return parts.join("\r\n");
}
const stamp = (v: Date) =>
  v
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
export function eventCalendar(e: {
  id: string;
  title: string;
  description: string;
  startsAt: Date;
  createdAt: Date;
  timezone: string;
  voiceInfo: string;
  cancelled: boolean;
  version: number;
}) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(e.id)) throw new Error("Invalid calendar identifier");
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Albion Atlas//Group Events//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${e.id}@albion-atlas`,
      `DTSTAMP:${stamp(e.createdAt)}`,
      `DTSTART:${stamp(e.startsAt)}`,
      `SEQUENCE:${e.version}`,
      `SUMMARY:${calendarText(e.title)}`,
      `DESCRIPTION:${calendarText([e.description, `Display timezone: ${e.timezone}`, `Voice: ${e.voiceInfo || "Not specified"}`].join("\n"))}`,
      `STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}
