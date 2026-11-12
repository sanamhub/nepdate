// iCalendar (RFC 5545) files of public holidays: all-day events on the AD date, named in English
// and Nepali. Used by the per-year files and by the subscription feed.
import { pad, type Day } from "./patro";

type Ymd = { year: number; month: number; day: number };

const ymd = (d: Ymd) => `${d.year}${pad(d.month)}${pad(d.day)}`;
const next = (d: Ymd): Ymd => {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + 1));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
};

/** RFC 5545 text: escape backslash, semicolon and comma. */
const text = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`);

const encoder = new TextEncoder();

/**
 * RFC 5545 section 3.1: lines longer than 75 octets are folded with CRLF and one space. Nepali
 * names are three octets a character, so a summary passes the limit quickly. Folds fall between
 * characters, never inside one.
 */
function fold(line: string): string {
  const parts: string[] = [];
  let current = "";
  let octets = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (octets + size > limit) {
      parts.push(current);
      current = "";
      octets = 0;
    }
    current += ch;
    octets += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export interface CalendarOptions {
  name: string;
  /** For a subscribed calendar: how often a calendar app should fetch it again. */
  refresh?: string;
}

export function holidayCalendar(days: Day[], { name, refresh }: CalendarOptions): Response {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NepDate//Patro//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${text(name)}`];
  if (refresh) lines.push(`REFRESH-INTERVAL;VALUE=DURATION:${refresh}`, `X-PUBLISHED-TTL:${refresh}`);
  for (const d of days) {
    const summary = d.events.map((e) => `${e.en} (${e.np})`).join(", ") || "Public holiday";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${d.iso}@patro.nepdate.com`,
      `DTSTAMP:${ymd(d.ad)}T000000Z`,
      `DTSTART;VALUE=DATE:${ymd(d.ad)}`,
      `DTEND;VALUE=DATE:${ymd(next(d.ad))}`,
      `SUMMARY:${text(summary)}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return new Response(`${lines.map(fold).join("\r\n")}\r\n`, {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
}
