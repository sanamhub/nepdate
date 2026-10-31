// The patro's views as HTML strings: the month grid, the year and decade zoom views, a day's card,
// today's panel and the month's details. The pages render them when they are built and
// scripts/app.ts renders the same functions in the browser, so the first paint and every later
// view are the same markup.
import { NepaliDate } from "nepdate-core";
import { PAKSHA, T, adMonth, adMonthLong, month, named, num, weekday, weekdayShort, type Lang } from "./i18n.ts";
import {
  FIRST_YEAR,
  LAST_YEAR,
  dayPath,
  day as dayOf,
  monthDays,
  pad,
  patroRange,
  yearHasPatro,
  type Day,
  type Tithi,
} from "./patro.ts";

/** Escapes text for HTML content and attribute values. */
export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const adIso = (d: Day) => `${d.ad.year}-${pad(d.ad.month)}-${pad(d.ad.day)}`;
const utcDays = (d: Day) => Date.UTC(d.ad.year, d.ad.month - 1, d.ad.day) / 86_400_000;
/** Whole days from `from` to `to`. */
export const daysBetween = (from: Day, to: Day) => Math.round(utcDays(to) - utcDays(from));

/** The moon of a tithi: the lit share grows through shukla paksha to Purnima and shrinks through
 *  krishna paksha to Aunsi (styles in patro.css). */
export function moon(tithi: Tithi): string {
  const lit = tithi.paksha === "shukla" ? tithi.number / 15 : 1 - tithi.number / 15;
  const shape = lit >= 1 ? "full" : lit <= 0 ? "new" : lit < 0.5 ? "crescent" : "gibbous";
  const ellipse = Math.round(Math.abs(1 - 2 * lit) * 100);
  return `<i class="moon ${tithi.paksha === "shukla" ? "waxing" : "waning"} ${shape}" style="--ellipse:${ellipse}%" aria-hidden="true"></i>`;
}

/** Where a Latin tithi name may break when a phone's cell is too narrow for it: the syllable
 *  breaks MitiBar uses (mitibar src/app/tithi_label.rs), so both read "Chatur-dashi". */
const TITHI_BREAKS: Record<string, string> = {
  Pratipadha: "Prati\u00adpadha",
  Dwitiya: "Dwi\u00adtiya",
  Tritiya: "Tri\u00adtiya",
  Chaturthi: "Chatur\u00adthi",
  Panchami: "Pan\u00adchami",
  Shashthi: "Shash\u00adthi",
  Saptami: "Sap\u00adtami",
  Ashtami: "Ash\u00adtami",
  Navami: "Na\u00advami",
  Dashami: "Da\u00adshami",
  Ekadashi: "Eka\u00addashi",
  Dwadashi: "Dwa\u00addashi",
  Trayodashi: "Trayo\u00addashi",
  Chaturdashi: "Chatur\u00addashi",
  Purnima: "Pur\u00adnima",
  Aunsi: "Aun\u00adsi",
};

/** The tithi's first word for a cell: "त्रयोदशी", or "Trayo-dashi" with a soft hyphen. */
const shortTithi = (t: Tithi, lang: Lang) => {
  const word = named(t, lang).replace(/\s.*$/, "");
  return lang === "en" ? (TITHI_BREAKS[word] ?? word) : word;
};

/** "Kartik 14, 2083" in the chosen language. */
export const bsLong = (d: Day, lang: Lang) =>
  `${month(d.date.month, lang)} ${num(d.date.day, lang)}, ${num(d.date.year, lang)}`;
/** "31 October 2026": the AD date, with Latin month names in both languages. */
export const adLong = (d: Day, lang: Lang) => `${num(d.ad.day, lang)} ${adMonthLong(d.ad.month)} ${num(d.ad.year, lang)}`;

/** "Oct to Nov 2026" or "Dec 2026 to Jan 2027": the AD months a BS month spans. */
export function adSpan(days: Day[], lang: Lang): string {
  const a = days[0].ad;
  const b = days[days.length - 1].ad;
  return a.year === b.year
    ? `${adMonth(a.month)}–${adMonth(b.month)} ${num(b.year, lang)}`
    : `${adMonth(a.month)} ${num(a.year, lang)}–${adMonth(b.month)} ${num(b.year, lang)}`;
}

/** The accessible name of a day cell: everything the cell shows, in words. */
function cellLabel(d: Day, lang: Lang, isToday: boolean): string {
  const t = T[lang];
  return [
    isToday ? t.today : "",
    `${weekday(d.weekday, lang)}, ${bsLong(d, lang)}`,
    adLong(d, lang),
    d.tithi ? named(d.tithi, lang) : "",
    d.holiday ? t.holiday : "",
    ...d.events.map((e) => named(e, lang)),
  ]
    .filter(Boolean)
    .join(", ");
}

/** How many of a day's events a wide cell names: two lines read at a glance and leave room. */
const CELL_EVENTS = 2;

export interface MonthOptions {
  /** Today's AD date "2026-10-31", to ring today; null when rendered at build time. */
  todayAd: string | null;
}

/** The weekday header and the day cells of a BS month, for the `.grid` element. */
export function monthGrid(year: number, m: number, lang: Lang, { todayAd }: MonthOptions): string {
  const days = monthDays(year, m);
  const head = Array.from(
    { length: 7 },
    (_, w) =>
      `<div role="columnheader" class="wd${w === 6 ? " sat" : ""}"><abbr title="${esc(weekday(w, lang))}">${esc(weekdayShort(w, lang))}</abbr></div>`,
  ).join("");
  const cells: string[] = Array.from({ length: days[0].weekday }, () => `<div role="gridcell" class="blank"></div>`);
  for (const d of days) {
    const ad = adIso(d);
    const isToday = ad === todayAd;
    const cls = ["cell", d.holiday && "holiday", d.weekday === 6 && "sat", isToday && "today", d.events.length > 0 && "has-events"]
      .filter(Boolean)
      .join(" ");
    // A wide cell names up to two events and a phone's narrow cell one; each counts the rest
    // (the CSS shows the count that fits). The card has them all.
    const shown = d.events.slice(0, CELL_EVENTS);
    const moreWide = d.events.length - shown.length;
    const moreNarrow = d.events.length - 1;
    cells.push(
      `<div role="gridcell"><button type="button" class="${cls}" data-bs="${d.iso}" data-ad="${ad}" tabindex="-1"${isToday ? ' aria-current="date"' : ""} aria-label="${esc(cellLabel(d, lang, isToday))}">` +
        `<span class="cell-bs">${num(d.date.day, lang)}</span>` +
        `<span class="cell-ad">${d.ad.day === 1 ? `<span class="ad-m">${adMonth(d.ad.month)} </span>` : ""}${num(d.ad.day, lang)}</span>` +
        (shown.length
          ? `<span class="cell-events">${shown.map((e) => `<span>${esc(named(e, lang))}</span>`).join("")}</span>` +
            (moreWide > 0 ? `<span class="cell-more wide">+${num(moreWide, lang)}</span>` : "") +
            (moreNarrow > 0 ? `<span class="cell-more narrow">+${num(moreNarrow, lang)}</span>` : "")
          : "") +
        (d.tithi ? `<span class="cell-tithi">${esc(shortTithi(d.tithi, lang))}</span>` : "") +
        (d.tithi && (d.tithi.number === 15 || d.tithi.number === 8) ? moon(d.tithi) : "") +
        `</button></div>`,
    );
  }
  while (cells.length % 7) cells.push(`<div role="gridcell" class="blank"></div>`);
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(`<div role="row">${cells.slice(i, i + 7).join("")}</div>`);
  return `<div role="row">${head}</div>${rows.join("")}`;
}

/** One moon per day of the month, in order, or nothing outside the tithi data. */
export function moonBand(year: number, m: number, lang: Lang): string {
  const days = monthDays(year, m);
  if (!days.some((d) => d.tithi)) return "";
  return days
    .map((d) => (d.tithi ? `<li title="${esc(`${num(d.date.day, lang)}: ${named(d.tithi, lang)}`)}">${moon(d.tithi)}</li>` : `<li><i class="moon"></i></li>`))
    .join("");
}

/** The twelve months of a year as tiles, for the year zoom view. */
export function yearTiles(year: number, lang: Lang, { viewed, today }: { viewed: number | null; today: NepaliDate | null }): string {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const days = monthDays(year, m);
    const holidays = days.filter((d) => d.holiday).length;
    const isToday = today?.year === year && today.month === m;
    const cls = ["tile", isToday && "today", viewed === m && "viewed"].filter(Boolean).join(" ");
    return (
      `<button type="button" class="${cls}" data-month="${m}"${isToday ? ' aria-current="date"' : ""}>` +
      `<span class="tile-name">${esc(month(m, lang))}</span>` +
      `<span class="tile-sub">${esc(adSpan(days, lang))}</span>` +
      (holidays ? `<span class="tile-note">${esc(T[lang].holidayCount(holidays))}</span>` : "") +
      `</button>`
    );
  }).join("");
}

/** The first year of the decade view that holds `year`: the decade, with a year on each side. */
export const decadeStart = (year: number) => Math.floor(year / 10) * 10 - 1;

/** Twelve years as tiles, for the decade zoom view. */
export function decadeTiles(start: number, lang: Lang, { viewed, today }: { viewed: number; today: NepaliDate | null }): string {
  return Array.from({ length: 12 }, (_, i) => {
    const y = start + i;
    if (y < FIRST_YEAR || y > LAST_YEAR) return `<span class="tile blank" aria-hidden="true"></span>`;
    const first = NepaliDate.of(y, 1, 1).toGregorian().year;
    const cls = ["tile", today?.year === y && "today", viewed === y && "viewed", (i === 0 || i === 11) && "edge"]
      .filter(Boolean)
      .join(" ");
    return (
      `<button type="button" class="${cls}" data-year="${y}"${today?.year === y ? ' aria-current="date"' : ""}>` +
      `<span class="tile-name">${num(y, lang)}</span>` +
      `<span class="tile-sub">${num(first, lang)}–${num(first + 1, lang)}</span>` +
      `</button>`
    );
  }).join("");
}

/** A day's card: the popover on the grid and the body of today's panel. */
export function dayCard(d: Day, lang: Lang, today: Day | null): string {
  const t = T[lang];
  const rel = today ? daysBetween(today, d) : null;
  const facts: string[] = [];
  if (d.tithi) {
    facts.push(
      `<div class="dc-fact"><dt>${t.tithi}</dt><dd>${esc(named(d.tithi, lang))}<span class="sub">${PAKSHA[d.tithi.paksha][lang]}</span></dd></div>`,
    );
  }
  if (d.events.length) {
    facts.push(
      `<div class="dc-fact"><dt>${t.eventsShort}</dt><dd><ul class="events">${d.events
        .map((e) => `<li>${esc(named(e, lang))}${lang === "ne" ? `<span class="sub" lang="en">${esc(e.en)}</span>` : ""}</li>`)
        .join("")}</ul></dd></div>`,
    );
  }
  return (
    `<div class="dc-leaf${d.holiday ? " holiday" : ""}${d.weekday === 6 ? " sat" : ""}">` +
    `<span class="dc-day">${num(d.date.day, lang)}</span>` +
    `<span class="dc-text"><span class="dc-weekday">${esc(weekday(d.weekday, lang))}</span>` +
    `<span class="dc-month">${esc(month(d.date.month, lang))} ${num(d.date.year, lang)}</span>` +
    `<span class="dc-ad">${esc(adLong(d, lang))}</span></span>` +
    (d.tithi ? moon(d.tithi) : "") +
    `</div>` +
    (d.holiday ? `<p class="badge">${t.holiday}</p>` : "") +
    (facts.length ? `<dl class="dc-facts">${facts.join("")}</dl>` : d.covered ? "" : `<p class="quiet">${esc(t.noData)}</p>`) +
    (d.covered && !d.events.length && !d.holiday ? `<p class="quiet">${t.nothing}</p>` : "") +
    (rel !== null && rel !== 0 ? `<p class="rel">${esc(t.rel(rel))}</p>` : "")
  );
}

/** The links under a day's card. */
export function dayCardLinks(d: Day, lang: Lang): string {
  return d.covered ? `<a class="card-link" href="${dayPath(d)}">${T[lang].dayPage}</a>` : "";
}

/** The next public holidays from `from` (itself included), at most `count`, within the data. */
export function upcomingHolidays(from: Day, count: number): Day[] {
  const end = patroRange().end;
  const found: Day[] = [];
  for (let d = from.date; found.length < count && NepaliDate.compare(d, end) <= 0; d = d.addDays(1)) {
    const value = dayOf(d);
    if (value.holiday) found.push(value);
  }
  return found;
}

/** The list of coming holidays in today's panel. */
export function upcomingList(today: Day, lang: Lang): string {
  const list = upcomingHolidays(today, 4);
  if (!list.length) return "";
  return list
    .map((d) => {
      const name = d.events[0] ? named(d.events[0], lang) : T[lang].holiday;
      return (
        `<li><button type="button" class="up" data-bs="${d.iso}">` +
        `<span class="up-date"><b>${num(d.date.day, lang)}</b> ${esc(month(d.date.month, lang))}</span>` +
        `<span class="up-name">${esc(name)}</span>` +
        `<span class="up-rel">${esc(T[lang].rel(daysBetween(today, d)))}</span>` +
        `</button></li>`
      );
    })
    .join("");
}

/** The month in detail: every day in order with its tithi and events, and the holidays beside. */
export function monthDetails(year: number, m: number, lang: Lang, { todayAd }: MonthOptions): string {
  const t = T[lang];
  const days = monthDays(year, m);
  const holidays = days.filter((d) => d.holiday);
  const rows = days
    .map((d) => {
      const isToday = adIso(d) === todayAd;
      const cls = ["row", d.holiday && "holiday", d.weekday === 6 && "sat", isToday && "today"].filter(Boolean).join(" ");
      return (
        `<li class="${cls}"${isToday ? ' aria-current="date"' : ""}>` +
        `<button type="button" class="row-date" data-bs="${d.iso}" aria-label="${esc(`${weekday(d.weekday, lang)}, ${bsLong(d, lang)}`)}">` +
        `<b>${num(d.date.day, lang)}</b><span>${esc(weekdayShort(d.weekday, lang))}</span></button>` +
        `<span class="row-ad">${adMonth(d.ad.month)} ${num(d.ad.day, lang)}</span>` +
        `<span class="row-tithi">${d.tithi ? `${moon(d.tithi)}${esc(named(d.tithi, lang))}` : ""}</span>` +
        `<span class="row-events">${d.holiday ? `<span class="tag">${t.holiday}</span>` : ""}${d.events.map((e) => esc(named(e, lang))).join(", ")}</span>` +
        `</li>`
      );
    })
    .join("");
  const side = holidays.length
    ? `<h3>${t.holidays}</h3><ol class="hol-list">${holidays
        .map(
          (d) =>
            `<li><span class="when">${num(d.date.day, lang)} <small>${adMonth(d.ad.month)} ${num(d.ad.day, lang)}</small></span>` +
            `<span>${esc(d.events.map((e) => named(e, lang)).join(", ") || t.holiday)}</span></li>`,
        )
        .join("")}</ol>`
    : "";
  const links = yearHasPatro(year)
    ? `<p class="detail-links"><a href="/${year}/">${t.yearPage}</a><a href="/${year}/holidays.ics" download>${t.ics}</a></p>`
    : `<p class="quiet">${t.noData}</p>`;
  return (
    `<section class="agenda" aria-labelledby="agenda-title"><h2 id="agenda-title" class="visually-hidden">${t.allDays}</h2><ol>${rows}</ol></section>` +
    `<aside class="agenda-side">${side}${links}</aside>`
  );
}

/** The heading of the month view: "कार्तिक २०८३". */
export const monthTitle = (year: number, m: number, lang: Lang) => `${month(m, lang)} ${num(year, lang)}`;
