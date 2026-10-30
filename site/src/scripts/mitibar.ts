// MitiBar's page in the browser: the bar shows the visitor's own date and time, the preset and
// language buttons rewrite it, the download tabs open on the visitor's system, and the hero's
// download button names it. Without JavaScript the page shows the default bar for the build day
// and the Windows files.
import { NepaliDate, toNepaliDigits } from "nepdate-core";
import { type Lang, type Preset, line, presets } from "./mitibar-bar";

let preset: Preset = presets[0];
let lang: Lang = "en";

function render() {
  const now = new Date();
  const today = NepaliDate.today();
  const top = line(preset.top, today, now, lang);
  const bottom = line(preset.bottom, today, now, lang);
  for (const bar of document.querySelectorAll<HTMLElement>("[data-bar]")) {
    bar.lang = lang;
    for (const [name, text, bold] of [
      ["top", top, preset.topBold],
      ["bottom", bottom, preset.bottomBold],
    ] as const) {
      const node = bar.querySelector<HTMLElement>(`[data-line="${name}"]`);
      if (!node) continue;
      node.textContent = text;
      node.classList.toggle("bold", bold);
    }
  }
  const tray = document.querySelector("[data-tray-day]");
  if (tray) tray.textContent = toNepaliDigits(today.day);
  const spoken = document.querySelector("[data-bar-text]");
  if (spoken) spoken.textContent = [top, bottom].filter(Boolean).join(". ");
}

/** A radio group of buttons: arrows move and pick, as the ARIA radio pattern has it. */
function radios(group: HTMLElement, pick: (button: HTMLButtonElement) => void) {
  const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  const select = (button: HTMLButtonElement, focus: boolean) => {
    for (const other of buttons) {
      other.setAttribute("aria-checked", String(other === button));
      other.tabIndex = other === button ? 0 : -1;
    }
    if (focus) button.focus();
    pick(button);
  };
  buttons.forEach((button, i) => {
    button.tabIndex = button.getAttribute("aria-checked") === "true" ? 0 : -1;
    button.addEventListener("click", () => select(button, false));
    button.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (step === undefined) return;
      event.preventDefault();
      select(buttons[(i + step + buttons.length) % buttons.length], true);
    });
  });
}

function controls() {
  const [presetGroup, langGroup] = document.querySelectorAll<HTMLElement>('.mb-controls [role="radiogroup"]');
  if (presetGroup) {
    radios(presetGroup, (button) => {
      preset = presets.find((p) => p.id === button.dataset.preset) ?? presets[0];
      render();
    });
  }
  if (langGroup) {
    radios(langGroup, (button) => {
      lang = button.dataset.lang === "ne" ? "ne" : "en";
      render();
    });
  }
}

function detectOs(): "windows" | "macos" | "linux" | null {
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.userAgent;
  if (/win/i.test(platform)) return "windows";
  if (/mac/i.test(platform) && !/iphone|ipad/i.test(navigator.userAgent)) return "macos";
  if (/linux|x11/i.test(platform) && !/android/i.test(navigator.userAgent)) return "linux";
  return null;
}

function downloads() {
  const root = document.querySelector<HTMLElement>("[data-tabs]");
  if (!root) return;
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const select = (tab: HTMLButtonElement, focus: boolean) => {
    for (const other of tabs) {
      const on = other === tab;
      other.setAttribute("aria-selected", String(on));
      other.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(other.getAttribute("aria-controls") ?? "");
      if (panel) panel.hidden = !on;
    }
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab, false));
    tab.addEventListener("keydown", (event) => {
      const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[event.key];
      if (to === undefined) return;
      event.preventDefault();
      select(tabs[(to + tabs.length) % tabs.length], true);
    });
  });

  const os = detectOs();
  const tab = tabs.find((t) => t.dataset.os === os);
  if (!tab) return;
  select(tab, false);
  const button = document.querySelector<HTMLAnchorElement>("[data-download]");
  if (button) button.textContent = `Download for ${tab.textContent?.trim()}`;
}

render();
controls();
downloads();
// The time field changes each minute; the date at midnight. Once a minute covers both.
setTimeout(
  () => {
    render();
    setInterval(render, 60_000);
  },
  60_000 - (Date.now() % 60_000),
);
