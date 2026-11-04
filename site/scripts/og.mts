// The link preview images: what a chat app or a search result shows when someone shares a NepDate
// link. Each card is a small HTML page drawn with the site's fonts, colours and marks, and headless
// Chrome takes the screenshot, so the cards stay in step with the site and need no design tool.
//
//   node scripts/og.mts            writes site/public/og*.png and patro/public/og.png
//   node scripts/og.mts --github   also writes the GitHub social previews to site/og-github/
//
// The GitHub social previews are uploaded by hand (repository Settings, Social preview): GitHub has
// no API for them. They are not part of the site, so they land outside public/.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as chromeLauncher from "chrome-launcher";
import { brandColours, langIcons, marks } from "../src/data/lang-icons.ts";

const site = fileURLToPath(new URL("../", import.meta.url));
const hub = join(site, "..");
const fonts = (pkg: string, file: string) => pathToFileURL(join(site, "node_modules", pkg, "files", file)).href;
const logo = readFileSync(join(site, "src/assets/nepdate.svg"), "utf8");
const mitibarIcon = `data:image/png;base64,${readFileSync(join(site, "src/assets/mitibar-icon.png")).toString("base64")}`;
const popup = `data:image/png;base64,${readFileSync(join(site, "public/mitibar/popup-light.png")).toString("base64")}`;

const names: Record<string, string> = {
  csharp: "C#", rust: "Rust", go: "Go", typescript: "TypeScript", python: "Python", php: "PHP", ruby: "Ruby",
  swift: "Swift", kotlin: "Kotlin", java: "Java", cpp: "C++", c: "C", dart: "Dart", zig: "Zig",
};
const languages = Object.keys(langIcons);
const deva = (n: number) => String(n).replace(/\d/g, (d) => "०१२३४५६७८९"[Number(d)]);

const mark = (id: string, size: number, colour = true) => {
  const m = marks[id];
  const fill = colour ? brandColours(m.hex).light.replace("var(--nd-ink)", "#211c17") : "currentColor";
  const paint = m.outline
    ? `fill="none" stroke="${fill}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`
    : `fill="${fill}"${m.evenOdd ? ' fill-rule="evenodd"' : ""}`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path ${paint} d="${m.path}"/></svg>`;
};
const markRow = (size: number) => `<div class="marks">${languages.map((id) => mark(id, size)).join("")}</div>`;

// A month sheet as the patro prints it: Saturdays as holidays, one day in the sindoor disc. The
// callers pass real months (Kartik 2083 starts on a Sunday and has 30 days; Baishakh 2083 starts
// on a Tuesday and has 31).
const sheet = (today: number, title: string, start = 0, length = 30) => {
  const head = ["आइत", "सोम", "मङ्गल", "बुध", "बिहि", "शुक्र", "शनि"].map((d) => `<b>${d}</b>`).join("");
  const cells = Array.from({ length: start }, () => "<i></i>").join("") +
    Array.from({ length }, (_, i) => {
      const day = i + 1;
      const saturday = (i + start) % 7 === 6;
      return `<span class="${day === today ? "today" : saturday ? "holiday" : ""}">${deva(day)}</span>`;
    }).join("");
  return `<div class="sheet"><p>${title}</p><div class="grid">${head}${cells}</div></div>`;
};

const base = (w: number, h: number) => `
@font-face { font-family: Noto; src: url(${fonts("@fontsource-variable/noto-sans", "noto-sans-latin-wght-normal.woff2")}); font-weight: 100 900; }
@font-face { font-family: NotoDeva; src: url(${fonts("@fontsource-variable/noto-sans-devanagari", "noto-sans-devanagari-devanagari-wght-normal.woff2")}); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
html, body { width: ${w}px; height: ${h}px; overflow: hidden; }
body { position: relative; background: #fdfbf8; color: #211c17; font-family: Noto, NotoDeva, sans-serif; }
body::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 12px; background: #c12b2b; }
.brand { position: absolute; left: 80px; top: 64px; display: flex; align-items: center; gap: 16px; font-size: 32px; font-weight: 700; }
.brand svg, .brand img { width: 52px; height: 52px; border-radius: 12px; }
.copy { position: absolute; left: 80px; top: 160px; width: 590px; }
.eyebrow { font-family: NotoDeva, Noto; font-size: 30px; font-weight: 600; color: #6e655c; }
h1 { margin-top: 16px; font-size: 60px; line-height: 1.04; font-weight: 800; letter-spacing: -0.03em; }
.sub { margin-top: 20px; font-size: 25px; line-height: 1.35; color: #6e655c; }
.marks { position: absolute; left: 80px; right: 80px; bottom: 56px; display: flex; justify-content: space-between; align-items: center; padding-top: 28px; border-top: 1px solid #e7e0d6; }
.sheet { position: absolute; right: 80px; top: 92px; width: 400px; padding: 26px 26px 22px; background: #fff; border: 1px solid #e7e0d6; border-radius: 22px; box-shadow: 0 2px 4px rgb(33 28 23 / .05), 0 30px 60px -24px rgb(33 28 23 / .28); font-family: NotoDeva, Noto; }
.sheet p { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
.grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px 0; text-align: center; }
.grid b { font-size: 13px; font-weight: 600; color: #6e655c; padding-bottom: 6px; }
.grid span { font-size: 21px; line-height: 40px; font-weight: 600; }
.grid .holiday { color: #c12b2b; }
.grid .today { justify-self: center; width: 40px; height: 40px; border-radius: 50%; background: #c12b2b; color: #fff; }
.moons { position: absolute; right: 80px; top: 60px; display: flex; gap: 8px; }
.moons i { width: 18px; height: 18px; border-radius: 50%; border: 1px solid #b4a998; }
`;

const page = (w: number, h: number, css: string, body: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${base(w, h)}${css}</style></head><body>${body}</body></html>`;

const brand = `<div class="brand">${logo}<span>NepDate</span></div>`;

const cards: { out: string; w: number; h: number; html: string }[] = [
  {
    out: join(site, "public/og.png"), w: 1200, h: 630,
    html: page(1200, 630, "", `${brand}
      <div class="copy"><p class="eyebrow">बिक्रम सम्बत् १९०१ – २१९९</p>
      <h1>Nepali dates, the same in every language.</h1>
      <p class="sub">${languages.length} languages, one dataset, one spec.</p></div>
      ${sheet(18, "कार्तिक २०८३")}${markRow(40)}`),
  },
  {
    out: join(site, "public/og-docs.png"), w: 1200, h: 630,
    html: page(1200, 630, "", `${brand}
      <div class="copy"><p class="eyebrow">Documentation</p>
      <h1>Install, convert, format and parse.</h1>
      <p class="sub">Guides and API for every language, with the patro for tithi, holidays and events.</p></div>
      ${sheet(1, "बैशाख २०८३", 2, 31)}${markRow(40)}`),
  },
  {
    out: join(site, "public/og-mitibar.png"), w: 1200, h: 630,
    html: page(1200, 630, `
      .shot { position: absolute; right: 64px; top: 70px; width: 440px; border-radius: 18px; box-shadow: 0 2px 4px rgb(33 28 23 / .05), 0 30px 60px -24px rgb(33 28 23 / .3); border: 1px solid #e7e0d6; }
      .os { position: absolute; left: 80px; bottom: 64px; display: flex; gap: 22px; align-items: center; font-size: 24px; color: #6e655c; }
      .os svg { color: #211c17; }`,
      `<div class="brand"><img src="${mitibarIcon}" alt=""><span>MitiBar</span></div>
      <div class="copy" style="width:560px"><p class="eyebrow">नेपाली मिति, तपाईंको डेस्कटपमा</p>
      <h1>Today's Nepali date, always in view.</h1>
      <p class="sub">The BS date in your tray, the month with tithi and holidays one click away.</p></div>
      <img class="shot" src="${popup}" alt="">
      <div class="os">${mark("windows", 30)}${mark("macos", 30)}${mark("linux", 30)}<span>Free for Windows, macOS and Linux</span></div>`),
  },
  {
    out: join(hub, "patro/public/og.png"), w: 1200, h: 630,
    html: page(1200, 630, `.url { position: absolute; left: 80px; bottom: 64px; font-size: 26px; font-weight: 600; color: #3f6383; }`,
      `<div class="brand">${logo}<span>NepDate Patro</span></div>
      <div class="copy" style="width:580px"><p class="eyebrow">नेपाली पात्रो</p>
      <h1>The Nepali calendar, day by day.</h1>
      <p class="sub">Every month with tithi, public holidays and events, and each year's holidays for your calendar app.</p></div>
      ${sheet(18, "कार्तिक २०८३")}
      <p class="url">patro.nepdate.com</p>`),
  },
];

if (process.argv.includes("--github")) {
  const out = join(site, "og-github");
  mkdirSync(out, { recursive: true });
  const repoCard = (title: string, sub: string, side: string) =>
    page(1280, 640, `.side { position: absolute; right: 110px; top: 150px; } .copy { width: 700px; top: 190px; }`,
      `${brand}<div class="copy"><h1>${title}</h1><p class="sub">${sub}</p></div><div class="side">${side}</div>${markRow(42)}`);
  for (const id of languages.filter((id) => id !== "csharp")) {
    cards.push({
      out: join(out, `nepdate-${id}.png`), w: 1280, h: 640,
      html: repoCard(`NepDate for ${names[id]}`, "Bikram Sambat dates: convert, add, format and parse, with tithi, holidays and events.", mark(id, 260)),
    });
  }
  cards.push(
    { out: join(out, "nepdate.png"), w: 1280, h: 640, html: repoCard("NepDate", `One calendar dataset and spec for ${languages.length} languages, the patro and the apps.`, sheet(18, "कार्तिक २०८३").replace('class="sheet"', 'class="sheet" style="position:static"')) },
    { out: join(out, "nepdate-php-patro.png"), w: 1280, h: 640, html: repoCard("NepDate Patro for PHP", "Tithi, public holidays and events for the NepDate PHP library.", mark("php", 260)) },
    { out: join(out, "mitibar.png"), w: 1280, h: 640, html: cards[2].html.replace("width: 1200px; height: 630px", "width: 1280px; height: 640px") },
    { out: join(out, "nepdate-mobile.png"), w: 1280, h: 640, html: repoCard("NepDate for Android and iOS", "Home-screen widgets and the month with tithi and holidays. Coming soon.", `<div style="display:flex;gap:40px">${mark("android", 200)}${mark("macos", 200)}</div>`) },
  );
}

const chrome = chromeLauncher.Launcher.getInstallations()[0];
if (!chrome) throw new Error("og: no Chrome found; install Chrome or set CHROME_PATH");
const work = mkdtempSync(join(tmpdir(), "nepdate-og-"));
try {
  for (const card of cards) {
    const file = join(work, "card.html");
    writeFileSync(file, card.html);
    execFileSync(chrome, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
      `--window-size=${card.w},${card.h}`, `--screenshot=${card.out}`, "--virtual-time-budget=2000",
      pathToFileURL(file).href,
    ], { stdio: "ignore" });
    console.log(`og: ${card.out}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
