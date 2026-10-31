// Lighthouse on a built site, the pull request check of both websites (.github/workflows/site.yml
// and patro.yml). Each project calls run() from its own scripts/lighthouse.mjs and passes in its
// own copies of lighthouse and chrome-launcher, so this file needs no packages of its own.
//
// Serves dist/ compressed, as Cloudflare does, and runs Lighthouse three times per page on a
// simulated phone and on a desktop. The median run of each must keep every category at 100 and
// performance at 95 or more: the aim is 100, and a shared CI runner's timing varies by a few
// points. Writes lighthouse/summary.md (also to the job summary) and the median run's HTML report
// per page, and exits 1 when a page falls below the bar.
import { appendFileSync, createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { createGzip } from "node:zlib";

const RUNS = 3;
const MIN_PERFORMANCE = 0.95;
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo", "agentic-browsing"];
const OUT = "lighthouse";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
};
const COMPRESSED = /^(text\/|application\/(json|xml|manifest\+json)|image\/svg)/;

/** dist/ over HTTP, text gzipped, a directory served as its index.html. */
function serve(dist) {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, "");
    if (path.split(/[/\\]/).includes("..")) return res.writeHead(400).end();
    let file = join(dist, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) return res.writeHead(404).end();
    const type = TYPES[extname(file)] ?? "application/octet-stream";
    const gzip = COMPRESSED.test(type);
    res.writeHead(200, { "content-type": type, ...(gzip ? { "content-encoding": "gzip" } : {}) });
    const stream = createReadStream(file);
    (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const pct = (score) => (score == null ? "n/a" : String(Math.round(score * 100)));

/**
 * Audits pages of dist and exits with the result.
 * @param {{ site: string, dist: string, pages: string[], lighthouse: Function,
 *   chromeLauncher: { launch: Function }, desktopConfig: object }} options
 *   site names the website in the summary and its comment marker (`<!-- <site>-lighthouse -->`).
 */
export async function run({ site, dist, pages, lighthouse, chromeLauncher, desktopConfig }) {
  /** One run in a fresh browser, a first visit as PageSpeed Insights makes it: a browser kept
   *  between runs keeps the page's storage, so later runs would be return visits. */
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

  const server = await serve(dist);
  const origin = `http://127.0.0.1:${server.address().port}`;
  mkdirSync(OUT, { recursive: true });

  const rows = [];
  let failed = false;
  try {
    for (const preset of ["mobile", "desktop"]) {
      for (const page of pages) {
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
    `<!-- ${site}-lighthouse -->`,
    `### Lighthouse on ${site}: ${failed ? "a page is below the bar" : "every page at the bar"}`,
    "",
    `The median of ${RUNS} runs per page on the built site. The bar: 100 in every category, and`,
    "performance 95 or more, since a CI runner's timing varies.",
    "",
    "| | Device | Page | Performance / Accessibility / Best practices / SEO / Agentic browsing | FCP | LCP | TBT | CLS |",
    "|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
    `Each median run's report is in the \`${site}-lighthouse\` artifact of the workflow run.`,
    "",
  ].join("\n");
  writeFileSync(join(OUT, "summary.md"), summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  process.exit(failed ? 1 : 0);
}
