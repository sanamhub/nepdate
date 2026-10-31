// The patro in the browser (components/App.astro). It keeps one state, the language, the zoom level
// and the month or year in view, and renders it with lib/render.ts, the same functions the pages
// were built with. Today is today in Nepal, read with Intl, so the visitor's time zone never
// matters.
import { NepaliDate } from "nepdate-core";
import { LANG_KEY, T, type Lang, num } from "../lib/i18n";
import { FIRST_YEAR, LAST_YEAR, day, monthDays, monthPath, pad } from "../lib/patro";
import {
  adSpan,
  bsLong,
  cellContext,
  dayCard,
  dayCardLinks,
  decadeStart,
  decadeTiles,
  monthDetails,
  monthGrid,
  monthTitle,
  moonBand,
  upcomingList,
  yearTiles,
} from "../lib/render";

type Level = "month" | "year" | "decade";
type Show = "month" | "details";

const app = document.querySelector<HTMLElement>("[data-app]");
if (app) start(app);

function start(app: HTMLElement) {
  const $ = <E extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<E>(sel) as E;
  const root = document.documentElement;
  const el = {
    title: $("[data-title]", app),
    titleBtn: $<HTMLButtonElement>("[data-zoom-out]", app),
    sub: $("[data-sub]", app),
    prev: $<HTMLButtonElement>('[data-step="-1"]', app),
    next: $<HTMLButtonElement>('[data-step="1"]', app),
    todayBtn: $<HTMLButtonElement>("[data-today]", app),
    stage: $("[data-stage]", app),
    monthView: $('[data-view="month"]', app),
    zoomView: $('[data-view="zoom"]', app),
    detailsView: $('[data-view="details"]', app),
    moons: $("[data-moons]", app),
    grid: $("[data-grid]", app),
    gridLabel: $("[data-grid-label]", app),
    tiles: $("[data-tiles]", app),
    details: $("[data-details]", app),
    todayCard: $("[data-today-card]", app),
    upcoming: $("[data-upcoming]", app),
    clock: $("[data-clock]", app),
    pop: $("[data-pop]"),
    popTitle: $("[data-pop-title]"),
    popBody: $("[data-pop-body]"),
    popLinks: $("[data-pop-links]"),
    goto: $<HTMLDialogElement>("[data-goto-dialog]"),
    gotoForm: $<HTMLFormElement>("[data-goto-form]"),
    gotoError: $("[data-goto-error]"),
  };

  const stored = (() => {
    try {
      return localStorage.getItem(LANG_KEY);
    } catch {
      return null;
    }
  })();
  const home = app.dataset.home !== undefined;
  /** What the page was built with: its month, in Nepali, and the build day as today. */
  const built = { year: Number(app.dataset.year), month: Number(app.dataset.month), today: app.dataset.builtToday };
  const state = {
    lang: (stored === "en" ? "en" : "ne") as Lang,
    level: "month" as Level,
    show: "month" as Show,
    year: Number(app.dataset.year),
    month: Number(app.dataset.month),
    /** The first year of the decade view. */
    decade: 0,
    /** The BS date ("2083-07-14") the grid's keyboard cursor is on. */
    cursor: "",
  };
  let today = day(NepaliDate.today());
  const todayAd = () => `${today.ad.year}-${pad(today.ad.month)}-${pad(today.ad.day)}`;
  if (home) {
    state.year = today.date.year;
    state.month = today.date.month;
  }
  state.decade = decadeStart(state.year);

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const hoverable = matchMedia("(hover: hover) and (pointer: fine)");
  const t = () => T[state.lang];

  // Rendering

  function render(motion?: "next" | "prev" | "out" | "in") {
    const { lang, level, year, month } = state;
    const isTodayMonth = year === today.date.year && month === today.date.month;
    el.monthView.hidden = level !== "month" || state.show !== "month";
    el.zoomView.hidden = level === "month";
    el.detailsView.hidden = level !== "month" || state.show !== "details";
    el.todayBtn.hidden = level === "month" && isTodayMonth;
    for (const b of app.querySelectorAll<HTMLButtonElement>("[data-show]")) b.setAttribute("aria-pressed", String(b.dataset.show === state.show));

    if (level === "month") {
      el.title.textContent = monthTitle(year, month, lang);
      el.sub.textContent = adSpan(monthDays(year, month), lang);
      el.prev.disabled = year === FIRST_YEAR && month === 1;
      el.next.disabled = year === LAST_YEAR && month === 12;
      el.prev.setAttribute("aria-label", t().prevMonth);
      el.next.setAttribute("aria-label", t().nextMonth);
      el.titleBtn.disabled = false;
      if (state.show === "month") {
        el.moons.innerHTML = moonBand(year, month, lang);
        el.grid.innerHTML = monthGrid(year, month, lang, { todayAd: todayAd() });
        el.gridLabel.textContent = `${monthTitle(year, month, lang)}. ${t().saturdayNote}`;
        placeCursor();
      } else {
        el.details.innerHTML = monthDetails(year, month, lang, { todayAd: todayAd() });
      }
      syncUrl();
    } else if (level === "year") {
      el.title.textContent = num(year, lang);
      el.sub.textContent = "";
      el.prev.disabled = year <= FIRST_YEAR;
      el.next.disabled = year >= LAST_YEAR;
      el.prev.setAttribute("aria-label", t().prevYear);
      el.next.setAttribute("aria-label", t().nextYear);
      el.titleBtn.disabled = false;
      el.tiles.className = "tiles";
      el.tiles.innerHTML = yearTiles(year, lang, { viewed: month, today: today.date });
    } else {
      const first = Math.max(state.decade + 1, FIRST_YEAR);
      const last = Math.min(state.decade + 10, LAST_YEAR);
      el.title.textContent = `${num(first, lang)}–${num(last, lang)}`;
      el.sub.textContent = "";
      el.prev.disabled = state.decade + 1 <= FIRST_YEAR;
      el.next.disabled = state.decade + 10 >= LAST_YEAR;
      el.prev.setAttribute("aria-label", t().prevDecade);
      el.next.setAttribute("aria-label", t().nextDecade);
      el.titleBtn.disabled = true;
      el.tiles.className = "tiles decade";
      el.tiles.innerHTML = decadeTiles(state.decade, lang, { viewed: year, today: today.date });
    }
    if (motion && !reduceMotion.matches) animate(motion);
  }

  function animate(motion: "next" | "prev" | "out" | "in") {
    const target = state.level === "month" ? (state.show === "month" ? el.monthView : el.detailsView) : el.zoomView;
    target.classList.remove("anim-next", "anim-prev", "anim-out", "anim-in");
    void target.offsetWidth; // restart the animation
    target.classList.add(`anim-${motion}`);
  }

  function renderToday() {
    el.todayCard.innerHTML = dayCard(today, state.lang, null);
    el.upcoming.innerHTML = upcomingList(today, state.lang);
    tick();
  }

  function renderChrome() {
    const strings = t() as unknown as Record<string, string>;
    root.lang = state.lang;
    root.dataset.lang = state.lang;
    for (const node of document.querySelectorAll<HTMLElement>("[data-t]")) node.textContent = strings[node.dataset.t as string];
    // Only the patro's own strings (lib/i18n.ts), never text from elsewhere.
    for (const node of document.querySelectorAll<HTMLElement>("[data-t-html]")) node.innerHTML = strings[node.dataset.tHtml as string];
    for (const node of document.querySelectorAll<HTMLElement>("[data-t-label]"))
      node.setAttribute("aria-label", strings[node.dataset.tLabel as string]);
    for (const node of document.querySelectorAll<HTMLInputElement>("[data-t-placeholder]"))
      node.placeholder = strings[node.dataset.tPlaceholder as string];
    for (const b of document.querySelectorAll<HTMLButtonElement>("button[data-lang]"))
      b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang));
  }

  const clockOptions = { timeZone: "Asia/Kathmandu", hour: "numeric", minute: "2-digit" } as const;
  const clockFormat = {
    ne: new Intl.DateTimeFormat("ne", { ...clockOptions, numberingSystem: "deva" }),
    en: new Intl.DateTimeFormat("en-US", clockOptions),
  };
  function tick() {
    el.clock.textContent = clockFormat[state.lang].format(new Date());
    const now = day(NepaliDate.today());
    if (now.iso !== today.iso) {
      // Midnight in Nepal: a new today.
      today = now;
      renderToday();
      render();
    }
  }

  function syncUrl() {
    const isTodayMonth = state.year === today.date.year && state.month === today.date.month;
    const path = home && isTodayMonth ? "/" : monthPath(state.year, state.month);
    if (location.pathname !== path) history.replaceState(null, "", path);
    document.title = `${monthTitle(state.year, state.month, state.lang)} | ${state.lang === "ne" ? "नेपाली पात्रो" : "Nepali Patro"}, NepDate`;
  }

  // Navigation

  function step(n: number) {
    closePop();
    if (state.level === "month") {
      const d = NepaliDate.of(state.year, state.month, 1).addMonths(n);
      if (d.year < FIRST_YEAR || d.year > LAST_YEAR) return;
      state.year = d.year;
      state.month = d.month;
      state.cursor = "";
    } else if (state.level === "year") {
      const y = state.year + n;
      if (y < FIRST_YEAR || y > LAST_YEAR) return;
      state.year = y;
    } else {
      const start = state.decade + 10 * n;
      if (start + 10 < FIRST_YEAR || start + 1 > LAST_YEAR) return;
      state.decade = start;
    }
    render(n > 0 ? "next" : "prev");
  }

  function zoomOut() {
    closePop();
    if (state.level === "month") state.level = "year";
    else if (state.level === "year") {
      state.level = "decade";
      state.decade = decadeStart(state.year);
    } else return;
    render("out");
    focusTile();
  }

  function zoomIn(value?: number) {
    closePop();
    if (state.level === "decade") {
      if (value !== undefined) state.year = value;
      state.level = "year";
      render("in");
      focusTile();
    } else if (state.level === "year") {
      if (value !== undefined) state.month = value;
      state.level = "month";
      state.cursor = "";
      render("in");
      focusCursor();
    }
  }

  /** Opens the month of a BS date and its day card. */
  function goTo(date: NepaliDate, open = true) {
    state.level = "month";
    state.show = "month";
    const moved = date.year !== state.year || date.month !== state.month;
    state.year = date.year;
    state.month = date.month;
    state.cursor = date.toJSON();
    render(moved ? "in" : undefined);
    const cell = cellFor(state.cursor);
    if (cell) {
      cell.focus();
      if (open) openPop(cell, true);
    }
  }

  function goToday() {
    state.level = "month";
    goTo(today.date, false);
  }

  // The grid's keyboard cursor: one cell is in the tab order, the arrow keys move it.

  const cellFor = (iso: string) => el.grid.querySelector<HTMLButtonElement>(`[data-bs="${iso}"]`);

  function placeCursor() {
    const inMonth = (iso: string) => iso.startsWith(`${state.year}-${pad(state.month)}-`);
    if (!state.cursor || !inMonth(state.cursor)) {
      state.cursor = inMonth(today.iso) ? today.iso : `${state.year}-${pad(state.month)}-01`;
    }
    const cell = cellFor(state.cursor);
    if (cell) cell.tabIndex = 0;
  }

  function focusCursor() {
    if (state.show === "month") cellFor(state.cursor)?.focus();
  }

  function moveCursor(days: number) {
    const target = NepaliDate.parse(state.cursor).addDays(days);
    if (target.year < FIRST_YEAR || target.year > LAST_YEAR) return;
    if (target.year !== state.year || target.month !== state.month) {
      state.year = target.year;
      state.month = target.month;
      state.cursor = target.toJSON();
      render(days > 0 ? "next" : "prev");
    } else {
      cellFor(state.cursor)?.setAttribute("tabindex", "-1");
      state.cursor = target.toJSON();
      const cell = cellFor(state.cursor);
      if (cell) cell.tabIndex = 0;
    }
    focusCursor();
    if (!el.pop.hidden && pinned) {
      const cell = cellFor(state.cursor);
      if (cell) openPop(cell, true, false);
    }
  }

  function focusTile() {
    const tile =
      el.tiles.querySelector<HTMLButtonElement>(".tile.viewed") ?? el.tiles.querySelector<HTMLButtonElement>("button.tile");
    tile?.focus();
  }

  function moveTile(from: HTMLElement, dx: number, dy: number) {
    const tiles = [...el.tiles.querySelectorAll<HTMLElement>(".tile")];
    const cols = tiles.filter((x) => x.offsetTop === tiles[0].offsetTop).length || 4;
    const i = tiles.indexOf(from) + dx + dy * cols;
    const target = tiles[i];
    if (target instanceof HTMLButtonElement) target.focus();
  }

  // The day card: a preview on hover, pinned by a click or Enter, a sheet on small screens.

  let pinned = false;
  let anchor: HTMLElement | null = null;
  let hoverTimer = 0;
  let leaveTimer = 0;

  function openPop(cell: HTMLElement, pin: boolean, moveFocus = true) {
    const iso = cell.dataset.bs;
    if (!iso) return;
    const d = day(NepaliDate.parse(iso));
    anchor = cell;
    pinned = pin;
    el.popTitle.textContent = `${bsLong(d, state.lang)}`;
    el.popBody.innerHTML = dayCard(d, state.lang, today);
    el.popLinks.innerHTML = dayCardLinks(d, state.lang);
    el.pop.hidden = false;
    el.pop.classList.toggle("pinned", pin);
    el.pop.classList.toggle("sheet", !hoverable.matches || innerWidth < 640);
    position();
    for (const c of app.querySelectorAll(".cell.open, .row-date.open")) c.classList.remove("open");
    cell.classList.add("open");
    if (pin && moveFocus && el.pop.classList.contains("sheet")) $<HTMLButtonElement>("[data-pop-close]").focus();
  }

  function position() {
    if (!anchor || el.pop.hidden) return;
    const pop = el.pop;
    if (pop.classList.contains("sheet")) {
      pop.style.left = pop.style.top = "";
      return;
    }
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const gap = 10;
    let left = r.right + gap;
    if (left + w > innerWidth - 8) left = r.left - gap - w;
    if (left < 8) left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
    let top = r.top + r.height / 2 - h / 2;
    top = Math.min(Math.max(8, top), innerHeight - h - 8);
    pop.style.left = `${Math.round(left)}px`;
    pop.style.top = `${Math.round(top)}px`;
  }

  function closePop(returnFocus = false) {
    clearTimeout(hoverTimer);
    if (el.pop.hidden) return;
    el.pop.hidden = true;
    pinned = false;
    anchor?.classList.remove("open");
    if (returnFocus) anchor?.focus();
    anchor = null;
  }

  // Events

  app.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const stepBtn = target.closest<HTMLElement>("[data-step]");
    if (stepBtn) return step(Number(stepBtn.dataset.step));
    if (target.closest("[data-zoom-out]")) return zoomOut();
    if (target.closest("[data-today], [data-go-today]")) return goToday();
    if (target.closest("[data-goto]")) return openGoto();
    const show = target.closest<HTMLElement>("[data-show]");
    if (show) {
      closePop();
      state.level = "month";
      state.show = show.dataset.show as Show;
      return render("in");
    }
    const tile = target.closest<HTMLElement>(".tile");
    if (tile?.dataset.month) return zoomIn(Number(tile.dataset.month));
    if (tile?.dataset.year) return zoomIn(Number(tile.dataset.year));
    const up = target.closest<HTMLElement>(".up");
    if (up?.dataset.bs) return goTo(NepaliDate.parse(up.dataset.bs));
    const cell = target.closest<HTMLElement>(".cell, .row-date");
    if (cell) {
      if (cell.classList.contains("cell")) {
        cellFor(state.cursor)?.setAttribute("tabindex", "-1");
        state.cursor = cell.dataset.bs as string;
        cell.tabIndex = 0;
      }
      if (anchor === cell && pinned) return closePop();
      return openPop(cell, true);
    }
  });

  for (const b of document.querySelectorAll<HTMLButtonElement>("button[data-lang]")) {
    b.addEventListener("click", () => setLang(b.dataset.lang === "en" ? "en" : "ne"));
  }

  function setLang(lang: Lang) {
    if (lang === state.lang) return;
    state.lang = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // Storage blocked: the choice lasts for this page only.
    }
    closePop();
    renderChrome();
    renderToday();
    render();
  }

  el.pop.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("[data-pop-close]")) closePop(true);
  });

  // Hover previews, on screens with a fine pointer only.
  el.stage.addEventListener("pointerover", (e) => {
    if (!hoverable.matches || pinned) return;
    const cell = (e.target as HTMLElement).closest<HTMLElement>(".cell");
    if (!cell) return;
    clearTimeout(leaveTimer);
    clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => openPop(cell, false), el.pop.hidden ? 260 : 60);
  });
  el.stage.addEventListener("pointerout", (e) => {
    if (!hoverable.matches || pinned) return;
    const to = e.relatedTarget as HTMLElement | null;
    if (to?.closest(".cell") || to?.closest("[data-pop]")) return;
    clearTimeout(hoverTimer);
    leaveTimer = window.setTimeout(() => closePop(), 120);
  });
  el.pop.addEventListener("pointerenter", () => clearTimeout(leaveTimer));
  el.pop.addEventListener("pointerleave", (e) => {
    if (pinned || (e.relatedTarget as HTMLElement | null)?.closest(".cell")) return;
    leaveTimer = window.setTimeout(() => closePop(), 120);
  });

  document.addEventListener("pointerdown", (e) => {
    const target = e.target as HTMLElement;
    if (!el.pop.hidden && !target.closest("[data-pop]") && !target.closest(".cell, .row-date")) closePop();
  });
  addEventListener("resize", position);
  addEventListener("scroll", () => (pinned ? position() : closePop()), { passive: true });

  document.addEventListener("keydown", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select, dialog")) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === "g") {
      e.preventDefault();
      return openGoto();
    }
    if (ctrl || e.altKey) return;
    if (e.key === "Escape") {
      if (!el.pop.hidden) return closePop(true);
      if (state.level !== "month") return zoomIn();
      return;
    }
    const inGrid = target.closest(".cell");
    const inTiles = target.closest(".tile");
    if (inGrid) {
      const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      if (e.key in moves) {
        e.preventDefault();
        return moveCursor(moves[e.key]);
      }
    }
    if (inTiles) {
      const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (e.key in moves) {
        e.preventDefault();
        return moveTile(inTiles as HTMLElement, ...moves[e.key]);
      }
    }
    if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      step(e.key === "PageUp" ? -1 : 1);
      if (state.level === "month") focusCursor();
      else focusTile();
      return;
    }
    if (target.closest("button, a") && !inGrid && !inTiles) return;
    if (e.key === "t" || e.key === "T" || e.key === "Home") {
      e.preventDefault();
      return goToday();
    }
    if (e.key === "-") return zoomOut();
    if (e.key === "+" || e.key === "=") return zoomIn();
  });

  // A pinch on a trackpad (ctrl + wheel) zooms; a sideways swipe on a trackpad or a touch screen
  // turns the page. The vertical wheel is left to scroll the page.
  let wheelAt = 0;
  let wheelX = 0;
  el.stage.addEventListener(
    "wheel",
    (e) => {
      const now = performance.now();
      if (e.ctrlKey) {
        e.preventDefault();
        if (now - wheelAt < 350 || Math.abs(e.deltaY) < 2) return;
        wheelAt = now;
        if (e.deltaY > 0) zoomOut();
        else zoomIn();
        return;
      }
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (now - wheelAt < 450) return;
      wheelX += e.deltaX;
      if (Math.abs(wheelX) > 60) {
        wheelAt = now;
        step(wheelX > 0 ? 1 : -1);
        wheelX = 0;
      }
    },
    { passive: false },
  );

  let touch: { x: number; y: number } | null = null;
  el.stage.addEventListener(
    "touchstart",
    (e) => {
      touch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    },
    { passive: true },
  );
  el.stage.addEventListener(
    "touchend",
    (e) => {
      if (!touch) return;
      const dx = e.changedTouches[0].clientX - touch.x;
      const dy = e.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    },
    { passive: true },
  );

  // Go to date: a BS or AD date, in either script's digits.

  function openGoto() {
    closePop();
    el.gotoError.textContent = "";
    el.goto.showModal();
    $<HTMLInputElement>('input[name="date"]', el.goto).select();
  }

  el.gotoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(el.gotoForm);
    const value = String(data.get("date") ?? "").trim();
    const date = parseInput(value, data.get("cal") === "ad");
    if (!date) {
      // A BS year outside the data's range gets the range; anything else the format.
      const year = Number(/^\s*(\d{4})/.exec(toLatinDigits(value))?.[1]);
      const outside = data.get("cal") !== "ad" && year > 0 && (year < FIRST_YEAR || year > LAST_YEAR);
      el.gotoError.textContent = outside ? t().goOut : t().goBad;
      return;
    }
    el.goto.close();
    goTo(date);
  });
  $("[data-goto-cancel]", el.goto).addEventListener("click", () => el.goto.close());

  const toLatinDigits = (value: string) => value.replace(/[०-९]/g, (c) => String(c.charCodeAt(0) - 0x966));

  function parseInput(value: string, ad: boolean): NepaliDate | null {
    if (!ad) {
      try {
        return NepaliDate.parseLenient(value);
      } catch {
        return null;
      }
    }
    const m = /^(\d{4})\D+(\d{1,2})\D+(\d{1,2})$/.exec(toLatinDigits(value));
    if (!m) return null;
    try {
      return NepaliDate.fromGregorian({ year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) });
    } catch {
      return null;
    }
  }

  // Start: the stored language, today in Nepal, and the clock each minute.
  // The built page shows the details only without JavaScript.
  el.detailsView.hidden = true;
  el.detailsView.removeAttribute("data-initial");
  root.classList.remove("lang-pending");
  if (state.lang === "ne" && state.year === built.year && state.month === built.month) {
    // The page was built with this month in Nepali, so it stays as it is: redrawing it would cost a
    // phone a second layout before anything else. Only today may have moved since the build.
    if (today.iso !== built.today) {
      moveTodayRing();
      renderToday();
    } else tick();
    el.todayBtn.hidden = state.year === today.date.year && state.month === today.date.month;
    placeCursor();
  } else {
    renderChrome();
    renderToday();
    render();
  }
  setInterval(tick, 30_000);

  /** Rings today on the built grid instead of the build day. */
  function moveTodayRing() {
    for (const cell of el.grid.querySelectorAll<HTMLElement>(".cell.today")) {
      cell.classList.remove("today");
      cell.removeAttribute("aria-current");
      setContext(cell, day(NepaliDate.parse(cell.dataset.bs as string)), false);
    }
    const cell = cellFor(today.iso);
    if (!cell) return;
    cell.classList.add("today");
    cell.setAttribute("aria-current", "date");
    setContext(cell, today, true);
  }

  function setContext(cell: HTMLElement, d: ReturnType<typeof day>, isToday: boolean) {
    const context = cell.querySelector(".visually-hidden");
    if (context) context.textContent = cellContext(d, state.lang, isToday);
  }
}
