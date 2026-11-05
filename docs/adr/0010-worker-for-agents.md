# ADR-0010: A small Worker in front of both websites, for agents

- **Status:** proposed
- **Date:** 2026-11-05
- **Approved by:** pending

## Context

ADR-0005 decision 5 and ADR-0006 serve nepdate.com and patro.nepdate.com as Cloudflare Workers
static assets "with no code of its own". A static file has one representation, so the sites
cannot answer what AI agents now ask for:

- `Accept: text/markdown` on a page, with `Content-Type: text/markdown` and `Vary: Accept`
  (acceptmarkdown.com). Both sites send HTML.
- A 404 that explains itself in Markdown, or in JSON to a client that asks for JSON. Both sites
  send the HTML 404 page.

Is Agentic (is-agentic.com) scored both sites 59/100 on 2026-11-05 and names these as essential
failures. The libraries, not the sites, are the product, but agents find the libraries through the
sites.

## Decision

1. **One shared Worker module, `web/agent-worker.js`,** used by `site/worker.js` and
   `patro/worker.js`. It chooses a representation and serves only files Astro built:
   - a client that names `text/markdown` at least as high as `text/html` gets the page's
     `index.md` with `Content-Type: text/markdown`; a page without one gets its HTML; a path with
     no page gets `404.md` with status 404;
   - a client that names `application/json` (and not Markdown) gets a JSON error with a code,
     message, resolution and links for a path with no page;
   - everyone else gets the static files exactly as before, with `Vary: Accept` on HTML.
2. **Markdown is built, not converted.** Each site builds `index.md` and `404.md` with Astro
   endpoints from the same data as its HTML, so nothing is parsed or rendered at request time.
3. **Only page requests reach the Worker.** `run_worker_first` in each `wrangler.jsonc` excludes
   scripts, styles, images, fonts and text files, which stay on the static path with no Worker
   invocation.
4. **Still no Cloudflare token in GitHub.** Workers Builds builds and deploys the Worker as it does
   the files; ADR-0005's deployment does not change.
5. **Tests in CI.** `node --test web/` runs in the site and patro workflows.

This amends ADR-0005 decision 5 and ADR-0006 on "no code of its own"; everything else in them
stands.

## Consequences

- Every page request is a Worker invocation. The free plan allows 100,000 a day; both sites are
  far below that, and the static files (most of the bytes) are not counted.
- The Worker is plain JavaScript with no dependencies, so it adds nothing to the dependency audit.
- A new page that wants a Markdown form adds an `index.md` endpoint; nothing else changes.
- Lighthouse and the HTML pages are unchanged for browsers.

## Alternatives considered

- **A Cloudflare zone setting that converts HTML to Markdown at the edge**: lives in the
  dashboard, not the repository, and gives no control over what the Markdown says.
- **Transform rules in the dashboard**: can set headers but not choose a different file, and would
  live outside the repository.
- **Markdown only at `/index.md`**: the readiness checks ask the page URL itself.
- **A public conversion API with OpenAPI**: a real product with a support burden; it needs its
  own decision.
