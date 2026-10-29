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

// The AD field's own calendar button, matching the BS picker's. It opens the browser's calendar
// with showPicker. Firefox keeps its built-in icon (no ::-webkit-calendar-picker-indicator to
// hide), so the button is only shown where that pseudo-element exists.
function adCalendarButton(form: HTMLFormElement, ad: HTMLInputElement) {
  const field = form.querySelector<HTMLElement>("[data-ad-field]");
  const button = form.querySelector<HTMLButtonElement>("[data-ad-button]");
  if (!field || !button || typeof ad.showPicker !== "function") return;
  if (!CSS.supports("selector(::-webkit-calendar-picker-indicator)")) return;
  field.classList.add("has-button");
  button.hidden = false;
  button.addEventListener("click", () => {
    try {
      ad.showPicker();
    } catch {
      ad.focus();
    }
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
  adCalendarButton(form, ad);

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
