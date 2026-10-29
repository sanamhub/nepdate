// The public holidays of a year as an iCalendar file, for calendar apps. All-day events on the AD
// date, named in English and Nepali.
import type { APIRoute } from "astro";
import { FIRST_YEAR, LAST_YEAR, pad, yearHasPatro, yearHolidays } from "../../lib/patro";

export function getStaticPaths() {
  const paths = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    if (yearHasPatro(year) && yearHolidays(year).length > 0) paths.push({ params: { year: String(year) } });
  }
  return paths;
}

const ymd = (d: { year: number; month: number; day: number }) => `${d.year}${pad(d.month)}${pad(d.day)}`;
const next = (d: { year: number; month: number; day: number }) => {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + 1));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
};
/** RFC 5545 text: escape backslash, semicolon and comma. */
const text = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`);

export const GET: APIRoute = ({ params }) => {
  const year = Number(params.year);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NepDate//Patro//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:Nepal public holidays ${year} BS`,
  ];
  for (const d of yearHolidays(year)) {
    const name = d.events.map((e) => `${e.en} (${e.np})`).join(", ") || "Public holiday";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${d.iso}@patro.nepdate.com`,
      `DTSTAMP:${ymd(d.ad)}T000000Z`,
      `DTSTART;VALUE=DATE:${ymd(d.ad)}`,
      `DTEND;VALUE=DATE:${ymd(next(d.ad))}`,
      `SUMMARY:${text(name)}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return new Response(`${lines.join("\r\n")}\r\n`, { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
};
