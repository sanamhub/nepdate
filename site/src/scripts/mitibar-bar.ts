// MitiBar's bar, as the app writes it (mitibar src/app/bar.rs): each line is a list of fields
// joined by " · ", an empty field left out with its separator. The page renders the default at
// build time and the script swaps presets and keeps the date and time current in the browser.
import { type NepaliDate, toNepaliDigits, weekdayName, weekdayShortName } from "nepdate-core";
import { info } from "nepdate-patro";

export type Lang = "en" | "ne";
export type Field = "weekday" | "weekday_long" | "bs_date" | "ad_date" | "ad_short" | "time" | "tithi" | "holiday";

export interface Preset {
  id: string;
  name: string;
  top: Field[];
  bottom: Field[];
  topBold: boolean;
  bottomBold: boolean;
}

/** The app's presets, in its order. "All" is left out: it is a preview of every field, not a bar. */
export const presets: Preset[] = [
  { id: "default", name: "Default", top: ["weekday", "ad_date"], bottom: ["bs_date"], topBold: false, bottomBold: true },
  {
    id: "time",
    name: "Date and time",
    top: ["weekday", "time"],
    bottom: ["bs_date", "ad_short"],
    topBold: false,
    bottomBold: true,
  },
  { id: "minimal", name: "Minimal", top: ["weekday", "bs_date"], bottom: [], topBold: true, bottomBold: false },
];

const SEPARATOR = " · ";
// The app keeps English AD month names in both languages and changes only the digits.
const AD_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const digits = (n: number, lang: Lang) => (lang === "ne" ? toNepaliDigits(n) : String(n));

function time(now: Date, lang: Lang): string {
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const text = `${hours % 12 || 12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
  return lang === "ne" ? text.replace(/\d/g, (d) => toNepaliDigits(Number(d))) : text;
}

function field(id: Field, date: NepaliDate, now: Date | null, lang: Lang): string {
  const ad = date.toGregorian();
  switch (id) {
    case "weekday":
      return weekdayShortName(date.weekday, lang);
    case "weekday_long":
      return weekdayName(date.weekday, lang);
    case "bs_date":
      return date.long({ year: true, pad: false, lang });
    case "ad_date":
      return `${AD_MONTHS[ad.month - 1]} ${digits(ad.day, lang)}, ${digits(ad.year, lang)}`;
    case "ad_short":
      return `${AD_MONTHS[ad.month - 1]} ${digits(ad.day, lang)}`;
    case "time":
      return now ? time(now, lang) : "";
    case "tithi": {
      const tithi = info(date).tithi;
      return tithi ? (lang === "ne" ? tithi.np : tithi.en) : "";
    }
    case "holiday": {
      const day = info(date);
      const event = day.isPublicHoliday ? day.events[0] : undefined;
      return event ? (lang === "ne" ? event.np : event.en) : "";
    }
  }
}

/** One line of the bar; `now` is null at build time, which leaves the time out. */
export function line(fields: Field[], date: NepaliDate, now: Date | null, lang: Lang): string {
  return fields
    .map((id) => field(id, date, now, lang))
    .filter((text) => text !== "")
    .join(SEPARATOR);
}
