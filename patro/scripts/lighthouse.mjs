// Lighthouse on the built site, as the pull request check (.github/workflows/patro.yml).
//
// Serves dist/ compressed, as Cloudflare does, and runs Lighthouse three times per page on a
// simulated phone and on a desktop. The median run of each must keep every category at 100 and
// performance at 95 or more: the aim is 100, and a shared CI runner's timing varies by a few
// points. Writes lighthouse/summary.md (also to the job summary) and the median run's HTML report
// per page, and exits 1 when a page falls below the bar.
//
//   npm run build && npm run lighthouse
import { appendFileSync, createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

const PAGES = ["/", "/2083/07/22/", "/2083/"];
const RUNS = 3;
const MIN_PERFORMANCE = 0.95;
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo", "agentic-browsing"];
const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const OUT = "lighthouse";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".xml": "application/xml",
};

/** dist/ over HTTP, text gzipped, a directory served as its index.html. */
function serve() {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, "");
    if (path.split(/[/\\]/).includes("..")) return res.writeHead(400).end();
    let file = join(DIST, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) return res.writeHead(404).end();
    const type = TYPES[extname(file)] ?? "application/octet-stream";
    const text = !type.startsWith("font/");
    res.writeHead(200, { "content-type": type, ...(text ? { "content-encoding": "gzip" } : {}) });
    const stream = createReadStream(file);
    (text ? stream.pipe(createGzip()) : stream).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const pct = (score) => (score == null ? "n/a" : String(Math.round(score * 100)));

/** One Lighthouse run in a fresh browser, a first visit as PageSpeed Insights makes it: a browser
 *  kept between runs keeps the page's localStorage, so later runs would be return visits. */
async function audit(url, preset) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });
  try {
    const { lhr, report } = await lighthouse(
      url,
      { port: chrome.port, output: ["json", "html"], logLevel: "error" },
      preset === "desktop" ? desktopConfig : undefined,
    );
    return { lhr, html: report[1] };
  } finally {
    chrome.kill();
  }
}

const server = await serve();
const origin = `http://127.0.0.1:${server.address().port}`;
mkdirSync(OUT, { recursive: true });

const rows = [];
let failed = false;
try {
  for (const preset of ["mobile", "desktop"]) {
    for (const page of PAGES) {
      const runs = [];
      for (let i = 0; i < RUNS; i++) runs.push(await audit(origin + page, preset));
      runs.sort((a, b) => a.lhr.categories.performance.score - b.lhr.categories.performance.score);
      const { lhr, html } = runs[Math.floor(runs.length / 2)];
      const below = CATEGORIES.filter((id) => {
        const score = lhr.categories[id]?.score ?? 0;
        return id === "performance" ? score < MIN_PERFORMANCE : score < 1;
      });
      if (below.length) failed = true;
      const slug = `${preset}-${page.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "home"}`;
      writeFileSync(join(OUT, `${slug}.html`), html);
      const scores = CATEGORIES.map((id) => pct(lhr.categories[id]?.score)).join(" / ");
      const metric = (id) => lhr.audits[id].displayValue;
      rows.push(
        `| ${below.length ? "Below" : "OK"} | ${preset} | \`${page}\` | ${scores} | ${metric("first-contentful-paint")} | ` +
          `${metric("largest-contentful-paint")} | ${metric("total-blocking-time")} | ${metric("cumulative-layout-shift")} |`,
      );
      console.log(`${preset} ${page}: ${scores}${below.length ? `, below the bar: ${below.join(", ")}` : ""}`);
    }
  }
} finally {
  server.close();
}

const summary = [
  "<!-- patro-lighthouse -->",
  `### Lighthouse on patro: ${failed ? "a page is below the bar" : "every page at the bar"}`,
  "",
  `The median of ${RUNS} runs per page on the built site. The bar: 100 in every category, and`,
  "performance 95 or more, since a CI runner's timing varies.",
  "",
  "| | Device | Page | Performance / Accessibility / Best practices / SEO / Agentic browsing | FCP | LCP | TBT | CLS |",
  "|---|---|---|---|---|---|---|---|",
  ...rows,
  "",
  "Each median run's report is in the `patro-lighthouse` artifact of the workflow run.",
  "",
].join("\n");
writeFileSync(join(OUT, "summary.md"), summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
process.exit(failed ? 1 : 0);
