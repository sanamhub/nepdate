// What the site knows about a day, read from nepdate-core and nepdate-patro when the pages are
// built. Everything a page shows comes through here, so a page never states more than the data.
import { NepaliDate, monthName, toNepaliDigits } from "nepdate-core";
import { coverage, info, type Named } from "nepdate-patro";

export const FIRST_YEAR = 1901;
export const LAST_YEAR = 2199;

export const WEEKDAYS = [
  { ne: "आइत", en: "Sun" },
  { ne: "सोम", en: "Mon" },
  { ne: "मङ्गल", en: "Tue" },
  { ne: "बुध", en: "Wed" },
  { ne: "बिहि", en: "Thu" },
  { ne: "शुक्र", en: "Fri" },
  { ne: "शनि", en: "Sat" },
] as const;

/** The fifteen tithis of a paksha in order; the fifteenth is Purnima or Aunsi. */
const TITHI_ORDER = [
  "Pratipadha",
  "Dwitiya",
  "Tritiya",
  "Chaturthi",
  "Panchami",
  "Shashthi",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dwadashi",
  "Trayodashi",
  "Chaturdashi",
] as const;

export type Paksha = "shukla" | "krishna";
export const PAKSHA_NAMES: Record<Paksha, Named> = {
  shukla: { np: "शुक्ल पक्ष", en: "Shukla paksha" },
  krishna: { np: "कृष्ण पक्ष", en: "Krishna paksha" },
};

export interface Tithi extends Named {
  paksha: Paksha;
  /** 1 to 15 within the paksha; 15 is Purnima (shukla) or Aunsi (krishna). */
  number: number;
}

export interface Day {
  date: NepaliDate;
  /** "2083-07-12" */
  iso: string;
  ad: { year: number; month: number; day: number };
  weekday: number;
  tithi: Tithi | null;
  holiday: boolean;
  events: readonly Named[];
  /** Whether the patro has any data for this day (tithi, holiday or event). */
  covered: boolean;
}

const range = coverage();

/** Some years of the data mark a Krishna-paksha tithi with " (K)" in English and "*" in Nepali,
 *  and others don't; the paksha is worked out below from the order of the tithis instead, so the
 *  marks are dropped. */
const plain = (name: Named): Named => ({
  np: name.np.replace(/\s*\(.*\)$|\*$/g, ""),
  en: name.en.replace(/\s*\(K\)$/, ""),
});

/** 1 to 15 within a paksha; Purnima and Aunsi are 15. */
const numberOf = (en: string) => {
  const index = TITHI_ORDER.indexOf(en as (typeof TITHI_ORDER)[number]);
  return index >= 0 ? index + 1 : 15;
};

/** The paksha of every day with a tithi. A paksha ends on Purnima (shukla) or Aunsi (krishna); a
 *  tithi can also be skipped, Purnima included (Chaturdashi then Pratipadha), so a tithi number
 *  smaller than the day before's also starts the other paksha. */
const pakshas = (() => {
  const days: { iso: string; en: string; n: number }[] = [];
  for (let d = range.start; NepaliDate.compare(d, range.end) <= 0; d = d.addDays(1)) {
    const tithi = info(d).tithi;
    if (tithi) {
      const en = plain(tithi).en;
      days.push({ iso: d.toJSON(), en, n: numberOf(en) });
    }
  }
  const result = new Map<string, Paksha>();
  const first = days.findIndex((d) => d.n === 15);
  if (first < 0) return result;
  const flip = (p: Paksha): Paksha => (p === "shukla" ? "krishna" : "shukla");
  // Forward from the first Purnima or Aunsi.
  let current: Paksha = days[first].en === "Purnima" ? "shukla" : "krishna";
  for (let i = first; i < days.length; i++) {
    const { en, n } = days[i];
    const prev = days[i - 1];
    if (n === 15) current = en === "Purnima" ? "shukla" : "krishna";
    else if (prev && (prev.n === 15 || n < prev.n)) current = prev.n === 15 ? (prev.en === "Purnima" ? "krishna" : "shukla") : flip(current);
    result.set(days[i].iso, current);
  }
  // Backward from it, for the days before it in the data.
  current = days[first].en === "Purnima" ? "shukla" : "krishna";
  for (let i = first - 1; i >= 0; i--) {
    if (days[i].n > days[i + 1].n) current = flip(current);
    result.set(days[i].iso, current);
  }
  return result;
})();

function tithiOf(date: NepaliDate, iso: string): Tithi | null {
  const raw = info(date).tithi;
  const paksha = pakshas.get(iso);
  if (!raw || !paksha) return null;
  const name = plain(raw);
  return { ...name, paksha, number: numberOf(name.en) };
}

export function day(date: NepaliDate): Day {
  const iso = date.toJSON();
  const data = info(date);
  const tithi = tithiOf(date, iso);
  return {
    date,
    iso,
    ad: date.toGregorian(),
    weekday: date.weekday,
    tithi,
    holiday: data.isPublicHoliday,
    events: data.events,
    covered: tithi !== null || data.isPublicHoliday || data.events.length > 0,
  };
}

/** The last day (29 to 32) of a BS month. */
export function monthLength(year: number, month: number): number {
  for (let d = 32; d > 28; d--) {
    try {
      NepaliDate.of(year, month, d);
      return d;
    } catch {
      // Not a day of this month.
    }
  }
  throw new Error(`monthLength: no length for ${year}-${month}`);
}

export function monthDays(year: number, month: number): Day[] {
  return Array.from({ length: monthLength(year, month) }, (_, i) => day(NepaliDate.of(year, month, i + 1)));
}

/** Whether any day of the year has patro data, so the year has holidays and day pages. */
export function yearHasPatro(year: number): boolean {
  return year >= range.start.year && year <= range.end.year;
}

export function patroRange() {
  return { start: range.start, end: range.end };
}

/** Every day the patro covers, for the day pages. */
export function coveredDays(): Day[] {
  const days: Day[] = [];
  for (let d = range.start; NepaliDate.compare(d, range.end) <= 0; d = d.addDays(1)) {
    const value = day(d);
    if (value.covered) days.push(value);
  }
  return days;
}

/** The public holidays of a year, with their names. */
export function yearHolidays(year: number): Day[] {
  if (!yearHasPatro(year)) return [];
  const days: Day[] = [];
  for (let m = 1; m <= 12; m++) for (const d of monthDays(year, m)) if (d.holiday) days.push(d);
  return days;
}

// Formatting

const adFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const adMonthFormat = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });
const adWeekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" });
const utc = (ad: Day["ad"]) => new Date(Date.UTC(ad.year, ad.month - 1, ad.day));

export const adLong = (d: Day) => adFormat.format(utc(d.ad));
export const adWeekdayName = (d: Day) => adWeekday.format(utc(d.ad));
export const adMonthName = (month: number) => adMonthFormat.format(new Date(Date.UTC(2000, month - 1, 1)));
export const ne = (n: number) => toNepaliDigits(n);
export const monthNe = (month: number) => monthName(month, "ne");
export const monthEn = (month: number) => monthName(month);
export const pad = (n: number) => String(n).padStart(2, "0");

/** "18 October to 16 November 2026", the AD span of a BS month. */
export function adSpan(days: Day[]): string {
  const first = days[0].ad;
  const last = days[days.length - 1].ad;
  const left =
    first.year === last.year ? `${first.day} ${adMonthName(first.month)}` : adFormat.format(utc(first));
  return `${left} to ${adFormat.format(utc(last))}`;
}

export const monthPath = (year: number, month: number) => `/${year}/${pad(month)}/`;
export const dayPath = (d: Day) => `/${d.date.year}/${pad(d.date.month)}/${pad(d.date.day)}/`;

/** The month before and after, or null at either end of the range. */
export function neighbours(year: number, month: number) {
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return {
    prev: prev.year >= FIRST_YEAR ? prev : null,
    next: next.year <= LAST_YEAR ? next : null,
  };
}
