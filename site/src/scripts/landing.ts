// The landing page's behaviour: today's date, the language tabs, the copy buttons and the
// converter. Everything works from the build-time HTML; this only refreshes and adds to it.
import { NepaliDate, NepDateError, monthName, toNepaliDigits } from "nepdate-core";
import "nepdate-datepicker/define";
import type { NepDateInputElement } from "nepdate-datepicker";

const adLong = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const adPlain = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const adOf = (d: NepaliDate) => {
  const g = d.toGregorian();
  return adLong.format(new Date(Date.UTC(g.year, g.month - 1, g.day)));
};

function showToday() {
  const today = NepaliDate.today();
  const set = (selector: string, text: string) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = text;
  };
  // The AD date the hero's opening sequence starts from; it is hidden once the sequence has played.
  const ad = today.toGregorian();
  set("[data-today-ad]", adPlain.format(new Date(Date.UTC(ad.year, ad.month - 1, ad.day))));
  set("[data-today-month]", monthName(today.month, "ne"));
  set("[data-today-day]", toNepaliDigits(today.day));
  set("[data-today-year]", toNepaliDigits(today.year));
  set("[data-today-en]", `${adOf(today)} is ${today.long({ pad: false })}.`);
}

function tabs(root: HTMLElement) {
  const list = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const select = (tab: HTMLButtonElement, focus: boolean) => {
    for (const other of list) {
      const on = other === tab;
      other.setAttribute("aria-selected", String(on));
      other.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(other.getAttribute("aria-controls") ?? "");
      if (panel) panel.hidden = !on;
    }
    if (focus) tab.focus();
  };
  list.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab, false));
    tab.addEventListener("keydown", (event) => {
      const moves: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: list.length - 1 };
      const to = moves[event.key];
      if (to === undefined) return;
      event.preventDefault();
      select(list[(to + list.length) % list.length], true);
    });
  });
}

function copyButtons() {
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-copy]")) {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy ?? "");
        button.textContent = "Copied";
      } catch {
        button.textContent = "Select and copy";
      }
      setTimeout(() => (button.textContent = "Copy"), 1600);
    });
  }
}

/** nepdate-patro is about 25 KB compressed, so it loads only when a date is converted. */
let patro: Promise<typeof import("nepdate-patro")> | undefined;
const loadPatro = () => (patro ??= import("nepdate-patro"));

/** The converter's day line: tithi, public holiday and events for the date, from nepdate-patro. */
async function showDay(out: HTMLElement, date: NepaliDate) {
  const { coverage, info } = await loadPatro();
  const { start, end } = coverage();
  const day = info(date);
  const set = (selector: string, text: string, lang?: string, holiday = false) => {
    const value = out.querySelector<HTMLElement>(`${selector} span:last-child`);
    if (!value) return;
    value.replaceChildren(text);
    value.classList.toggle("is-holiday", holiday);
    if (lang) {
      const native = document.createElement("span");
      native.lang = lang;
      native.textContent = lang === "ne" && day.tithi ? day.tithi.np : "";
      value.append(native);
    }
  };
  if (NepaliDate.compare(date, start) < 0 || NepaliDate.compare(date, end) > 0) {
    const range = `The patro covers BS ${start.toJSON()} to ${end.toJSON()}.`;
    set(".day-tithi", range);
    set(".day-holiday", "No holiday data for this day");
    set(".day-events", "No event data for this day");
    return;
  }
  set(".day-tithi", day.tithi ? `${day.tithi.en}, ` : "None listed", day.tithi ? "ne" : undefined);
  set(".day-holiday", day.isPublicHoliday ? "Public holiday" : "Not a public holiday", undefined, day.isPublicHoliday);
  set(".day-events", day.events.length ? day.events.map((e) => e.en).join(", ") : "None listed");
}

/** Why a value isn't a date, in words a visitor can act on. */
function reason(error: unknown): string {
  if (!(error instanceof NepDateError)) return "That isn't a date this converter understands.";
  switch (error.kind) {
    case "out-of-range":
      return "Outside the supported range, BS 1901-01-01 to 2199-12-30.";
    case "invalid-month":
      return "There is no such month. Months run from 1 (Baishakh) to 12 (Chaitra).";
    case "invalid-day":
      return "That month doesn't have that many days.";
    case "invalid-gregorian":
      return "That isn't a real Gregorian date.";
    case "ambiguous":
      return "Ambiguous. Write the year with four digits, for example 2081/04/15.";
    default:
      return "Write it as 2081/04/15 or 15 Shrawan 2081.";
  }
}

// The AD field's calendar. The browser's own date picker can't be styled, so the AD field opens a
// month grid drawn like the BS picker's, with each day's BS date under it (the BS picker shows the
// AD day the same way). Typing in the field still works as before. Firefox draws its own calendar
// icon inside a date input, which can't be hidden, so there the field keeps the browser's picker.
const AD_MIN = Date.UTC(1844, 3, 11);
const AD_MAX = Date.UTC(2143, 3, 15);
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY = 86_400_000;

function adCalendar(form: HTMLFormElement, ad: HTMLInputElement, pick: () => void) {
  const field = form.querySelector<HTMLElement>("[data-ad-field]");
  const button = form.querySelector<HTMLButtonElement>("[data-ad-button]");
  const panel = form.querySelector<HTMLElement>("[data-ad-cal]");
  if (!field || !button || !panel) return;
  if (!CSS.supports("selector(::-webkit-calendar-picker-indicator)")) return;
  field.classList.add("has-button");
  button.hidden = false;

  // Dates are UTC midnights in milliseconds, so stepping by days never meets a time zone change.
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  const parse = (value: string) => {
    const [y, m, d] = value.split("-").map(Number);
    return y && m && d ? Date.UTC(y, m - 1, d) : null;
  };
  const localToday = () => {
    const now = new Date();
    return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  };
  let focus = localToday();
  let view = new Date(focus);

  const control = (label: string, text: string) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.setAttribute("aria-label", label);
    return b;
  };
  const prev = control("Previous month", "‹");
  const next = control("Next month", "›");
  const month = document.createElement("select");
  month.setAttribute("aria-label", "Month");
  MONTHS.forEach((name, i) => month.append(new Option(name, String(i))));
  const year = document.createElement("select");
  year.setAttribute("aria-label", "Year");
  for (let y = 1844; y <= 2143; y++) year.append(new Option(String(y), String(y)));
  const head = document.createElement("div");
  head.className = "ad-cal-head";
  head.append(prev, month, year, next);
  const grid = document.createElement("div");
  grid.className = "ad-cal-grid";
  panel.append(head, grid);

  const draw = () => {
    const y = view.getUTCFullYear();
    const m = view.getUTCMonth();
    month.value = String(m);
    year.value = String(y);
    grid.replaceChildren();
    for (const name of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
      const cell = document.createElement("span");
      cell.className = "ad-cal-wd";
      cell.textContent = name;
      grid.append(cell);
    }
    const offset = new Date(Date.UTC(y, m, 1)).getUTCDay();
    for (let i = 0; i < offset; i++) grid.append(document.createElement("span"));
    const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const today = iso(localToday());
    for (let day = 1; day <= days; day++) {
      const t = Date.UTC(y, m, day);
      const key = iso(t);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.dataset.date = key;
      cell.tabIndex = t === focus ? 0 : -1;
      cell.disabled = t < AD_MIN || t > AD_MAX;
      cell.setAttribute("aria-label", `${day} ${MONTHS[m]} ${y}`);
      if (key === ad.value) cell.setAttribute("aria-pressed", "true");
      if (key === today) cell.classList.add("today");
      const top = document.createElement("span");
      top.textContent = String(day);
      const bs = document.createElement("small");
      bs.textContent = cell.disabled ? "" : String(NepaliDate.fromGregorian({ year: y, month: m + 1, day }).day);
      cell.append(top, bs);
      grid.append(cell);
    }
  };
  const goTo = (t: number) => {
    if (t < AD_MIN || t > AD_MAX) return;
    focus = t;
    view = new Date(t);
    draw();
    grid.querySelector<HTMLButtonElement>(`[data-date="${iso(t)}"]`)?.focus();
  };
  const shift = (months: number) => {
    view = new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth() + months, 1));
    draw();
  };
  const outside = (event: PointerEvent) => {
    const target = event.target as Node;
    if (!field.contains(target) && !panel.contains(target)) close(false);
  };
  const close = (restore: boolean) => {
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", outside);
    if (restore) button.focus();
  };
  const open = () => {
    focus = parse(ad.value) ?? localToday();
    view = new Date(focus);
    draw();
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", outside);
    grid.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
  };

  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-expanded", "false");
  button.addEventListener("click", () => (panel.hidden ? open() : close(true)));
  prev.addEventListener("click", () => shift(-1));
  next.addEventListener("click", () => shift(1));
  month.addEventListener("change", () => {
    view = new Date(Date.UTC(view.getUTCFullYear(), Number(month.value), 1));
    draw();
  });
  year.addEventListener("change", () => {
    view = new Date(Date.UTC(Number(year.value), view.getUTCMonth(), 1));
    draw();
  });
  grid.addEventListener("click", (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-date]");
    if (!cell || cell.disabled) return;
    ad.value = cell.dataset.date!;
    pick();
    close(true);
  });
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") return close(true);
    const cell = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-date]");
    if (!cell) return;
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const step = steps[event.key];
    if (step === undefined) return;
    event.preventDefault();
    goTo(parse(cell.dataset.date!)! + step * DAY);
  });
}

function converter(form: HTMLFormElement) {
  const bs = form.querySelector<NepDateInputElement>("#bs-input");
  const ad = form.querySelector<HTMLInputElement>("#ad-input");
  const bsOut = form.querySelector<HTMLElement>("[data-bs-result]");
  const adOut = form.querySelector<HTMLElement>("[data-ad-result]");
  const dayOut = form.querySelector<HTMLElement>("[data-day-info]");
  if (!bs || !ad || !bsOut || !adOut || !dayOut) return;
  form.addEventListener("submit", (event) => event.preventDefault());

  const render = (out: HTMLElement, lines: [string, string?], error = false) => {
    out.classList.toggle("error", error);
    out.replaceChildren();
    const main = document.createElement("strong");
    main.textContent = lines[0];
    out.append(main);
    if (lines[1]) {
      const second = document.createElement("span");
      second.lang = "ne";
      second.textContent = lines[1];
      out.append(second);
    }
  };

  const showBoth = (date: NepaliDate) => {
    render(bsOut, [`AD ${adOf(date)}`, date.long({ weekday: true, lang: "ne" })]);
    render(adOut, [`BS ${date.long({ weekday: true, pad: false })}`, date.long({ weekday: true, lang: "ne" })]);
    if (seen) showDay(dayOut, date).catch(() => dayOut.classList.add("unavailable"));
  };
  // The day line needs nepdate-patro, so it waits until the converter is on screen.
  let seen = false;
  new IntersectionObserver((entries, observer) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    observer.disconnect();
    seen = true;
    if (bs.date) showDay(dayOut, bs.date).catch(() => dayOut.classList.add("unavailable"));
  }).observe(form);

  // The picker parses what the visitor types and fires change when the date is committed (Enter,
  // leaving the field or a day chosen in the calendar). Text it can't read leaves no date and
  // sets validity.badInput.
  const fromBs = () => {
    const date = bs.date;
    if (date) {
      const g = date.toGregorian();
      ad.value = `${g.year}-${String(g.month).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`;
      return showBoth(date);
    }
    if (!bs.validity.badInput) return render(bsOut, ["Type a BS date or choose one."], true);
    // Parse the typed text again for the reason; the picker only reports that it isn't a date.
    const typed = bs.shadowRoot?.querySelector<HTMLInputElement>('[part~="input"]')?.value ?? "";
    try {
      NepaliDate.parseLenient(typed);
      render(bsOut, [reason(undefined)], true);
    } catch (error) {
      render(bsOut, [reason(error)], true);
    }
  };

  const fromAd = () => {
    const [y, m, d] = ad.value.split("-").map(Number);
    if (!y || !m || !d) return render(adOut, ["Pick a date."], true);
    try {
      const date = NepaliDate.fromGregorian({ year: y, month: m, day: d });
      bs.date = date;
      showBoth(date);
    } catch (error) {
      render(adOut, [reason(error)], true);
    }
  };

  bs.addEventListener("change", fromBs);
  ad.addEventListener("input", fromAd);
  adCalendar(form, ad, fromAd);
  // The page may have been built days ago: start from the visitor's own today.
  bs.date = NepaliDate.today();
  fromBs();
}

/** The month-length table: pointing at a month shows its AD dates in the line under the table,
 *  in the same words as the build-time line (components/landing/MonthLengths.astro). */
function monthSpans() {
  const line = document.querySelector<HTMLElement>("[data-months-span]");
  const table = document.querySelector<HTMLTableElement>("[data-months]");
  if (!line || !table) return;
  const initial = line.textContent;
  const plain = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const adDay = (d: NepaliDate) => {
    const g = d.toGregorian();
    return plain.format(new Date(Date.UTC(g.year, g.month - 1, g.day)));
  };
  table.addEventListener("pointerover", (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLTableCellElement>("td");
    const year = Number(cell?.parentElement?.dataset.year);
    if (!cell || !year) return;
    const month = cell.cellIndex; // column 0 is the year
    const first = NepaliDate.of(year, month, 1);
    const last = NepaliDate.of(year, month, Number.parseInt(cell.textContent ?? "", 10));
    line.textContent = `${monthName(month)} ${year}: ${adDay(first)} to ${adDay(last)}`;
  });
  table.addEventListener("pointerleave", () => (line.textContent = initial));
}

/** Turns the hero's date over at midnight in Nepal (UTC+05:45), for a page left open overnight. */
function tickAtNepalMidnight() {
  const offset = (5 * 60 + 45) * 60_000;
  const day = 86_400_000;
  const wait = day - ((Date.now() + offset) % day) + 1000;
  setTimeout(() => {
    showToday();
    tickAtNepalMidnight();
  }, wait);
}

showToday();
tickAtNepalMidnight();
monthSpans();
document.querySelectorAll<HTMLElement>("[data-tabs]").forEach(tabs);
copyButtons();
const form = document.querySelector<HTMLFormElement>("[data-converter]");
if (form) converter(form);
