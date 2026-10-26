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

function converter(form: HTMLFormElement) {
  const bs = form.querySelector<NepDateInputElement>("#bs-input");
  const ad = form.querySelector<HTMLInputElement>("#ad-input");
  const bsOut = form.querySelector<HTMLElement>("[data-bs-result]");
  const adOut = form.querySelector<HTMLElement>("[data-ad-result]");
  if (!bs || !ad || !bsOut || !adOut) return;
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
  };

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
  fromBs();
}

showToday();
document.querySelectorAll<HTMLElement>("[data-tabs]").forEach(tabs);
copyButtons();
const form = document.querySelector<HTMLFormElement>("[data-converter]");
if (form) converter(form);
