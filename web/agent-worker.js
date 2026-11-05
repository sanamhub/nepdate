// The Worker in front of the static files of nepdate.com and patro.nepdate.com (ADR-0010). It only
// chooses a representation; every byte it serves is a file Astro built into dist/.
//
// - Accept prefers text/markdown: the page's Markdown file (`/` -> `/index.md`, `/a/b/` ->
//   `/a/b/index.md`) with Content-Type text/markdown. A page without one is served as HTML; a
//   path without a page gets `/404.md` with status 404.
// - Accept prefers application/json on a path without a page: a JSON error with status 404.
// - Anything else: the static files as before, with Vary: Accept on HTML so a cache keeps the
//   representations apart.
//
// wrangler.jsonc sends only page requests here (run_worker_first); scripts, styles, fonts and
// images go straight to the static files.

/** @typedef {{ fetch(request: Request): Promise<Response> }} Assets */

const MARKDOWN = "text/markdown; charset=utf-8";
const JSON_TYPE = "application/json; charset=utf-8";

/**
 * The quality (q, RFC 9110 section 12.4.2) the Accept header gives one media type when it names
 * it exactly; 0 when it does not. Wildcards are ignored on purpose: `*\/*` says nothing about
 * wanting Markdown.
 * @param {string} accept
 * @param {string} type like "text/html"
 */
export function quality(accept, type) {
  for (const part of accept.split(",")) {
    const [range, ...params] = part.trim().toLowerCase().split(";");
    if (range.trim() !== type) continue;
    for (const param of params) {
      const [key, value] = param.trim().split("=");
      if (key === "q") return Number.parseFloat(value) || 0;
    }
    return 1;
  }
  return 0;
}

/**
 * What the client asked for: "markdown" or "json" only when it names that type and ranks it at
 * least as high as any text/html it names. Browsers name text/html first, so they get HTML.
 * @param {string | null} accept
 * @returns {"markdown" | "json" | "html"}
 */
export function preferred(accept) {
  if (!accept) return "html";
  const html = quality(accept, "text/html");
  const markdown = quality(accept, "text/markdown");
  if (markdown > 0 && markdown >= html) return "markdown";
  const json = quality(accept, "application/json");
  if (json > 0 && json >= html) return "json";
  return "html";
}

/** The Markdown file for a page path: `/` -> `/index.md`, `/a/b` and `/a/b/` -> `/a/b/index.md`. */
export function markdownPath(pathname) {
  if (pathname.endsWith(".md")) return pathname;
  return `${pathname.replace(/\/+$/, "")}/index.md`;
}

/** The response with Vary: Accept added, keeping its status and other headers. */
function withVary(response) {
  const headers = new Headers(response.headers);
  const vary = headers.get("Vary");
  if (!vary || !/(^|,)\s*accept\s*(,|$)/i.test(vary)) headers.set("Vary", vary ? `${vary}, Accept` : "Accept");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** A static file's body under a new status and Content-Type, with Vary: Accept. */
function as(response, status, contentType) {
  const headers = new Headers(response.headers);
  headers.set("Content-Type", contentType);
  headers.set("Vary", "Accept");
  headers.delete("Content-Length");
  return new Response(response.body, { status, headers });
}

/**
 * The JSON error for a path with no page.
 * @param {URL} url
 * @param {{ docs: string, llms: string }} links
 */
export function notFoundJson(url, links) {
  return {
    error: {
      code: "not_found",
      status: 404,
      message: `No page at ${url.pathname}.`,
      resolution: `This site has no API. Its pages are listed in ${links.llms}; the documentation starts at ${links.docs}.`,
      docs: links.docs,
      llms: links.llms,
    },
  };
}

/**
 * @param {{ docs: string }} options docs: the URL an error points to for help
 * @returns {{ fetch(request: Request, env: { ASSETS: Assets }): Promise<Response> }}
 */
export function createWorker({ docs }) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (request.method !== "GET" && request.method !== "HEAD") return env.ASSETS.fetch(request);

      const kind = preferred(request.headers.get("Accept"));
      const asset = (path) => env.ASSETS.fetch(new Request(new URL(path, url), { method: request.method }));

      if (kind === "markdown") {
        const markdown = await asset(markdownPath(url.pathname));
        if (markdown.ok) return as(markdown, 200, MARKDOWN);
        const page = await env.ASSETS.fetch(request);
        if (page.status !== 404) return withVary(page);
        const missing = await asset("/404.md");
        if (missing.ok) return as(missing, 404, MARKDOWN);
        return withVary(page);
      }

      const page = await env.ASSETS.fetch(request);
      if (kind === "json" && page.status === 404) {
        const body = JSON.stringify(notFoundJson(url, { docs, llms: new URL("/llms.txt", url).href }), null, 2);
        return new Response(request.method === "HEAD" ? null : `${body}\n`, {
          status: 404,
          headers: { "Content-Type": JSON_TYPE, Vary: "Accept", "X-Content-Type-Options": "nosniff" },
        });
      }
      const type = page.headers.get("Content-Type") ?? "";
      return type.startsWith("text/html") ? withVary(page) : page;
    },
  };
}
