# ADR-0005: The website on nepdate.com, built from site/ in the hub

- **Status:** accepted
- **Date:** 2026-10-24
- **Approved by:** Sanam

## Context

The family has seven libraries and two apps, each with a README, an API.md and release notes in its
own repository. Someone looking for "Nepali date in Python" lands on one of them and has no single
place that says which package to install, what the patro is, or that every port gives the same
answer. The owner bought `nepdate.com` (on Cloudflare, account `sanampakuwal`) for a landing page and
documentation for all languages.

Choices that had to be made: the docs framework, where the site lives, the URL layout, the site
language, how it deploys, and how the docs stay correct as the ports change.

## Decision

1. **Astro with Starlight**, static output. Starlight gives navigation, Pagefind search with no
   service behind it, synced code tabs, dark mode, i18n and an `llms.txt` plugin; the landing page
   is a plain Astro page in the same project. Versions are pinned exactly, installed with a one-week
   cooldown (`npm install --before`), and the lock file is committed.
2. **`site/` in the hub.** The hub already owns what is the same in every language; the site is
   the readable version of that. One repository, one review, one CI.
3. **One host, `nepdate.com`**, with the docs under `/docs/`. `www.nepdate.com` redirects to it.
4. **English first.** The structure is ready for a Nepali translation at `/ne/` without moving
   pages; Devanagari already appears where it is product content (dates, month names).
5. **Cloudflare Workers static assets, built by Workers Builds** from this repository: production
   on `main`, a preview URL for each pull request. The Worker has no code, so no Cloudflare token
   is stored in GitHub. `site/wrangler.jsonc` holds the configuration.
6. **Correctness rules for the docs:**
   - Code on the site is copied from the port's README, which that port's CI runs, or built only
     from names in its `docs/API.md`. The cross-language snippets on the landing page and the quick
     start were run for Rust, TypeScript and Python before publishing.
   - Versions, package names and install lines live in `site/src/data/ports.ts` only;
     `scripts/check-versions.mjs` fails CI when a page types a version.
   - Internal links are checked at build time (`starlight-links-validator`).
   - API reference stays where each language publishes it (docs.rs, pkg.go.dev, each `docs/API.md`);
     the site links to it rather than copying it.
7. **Look and feel from MitiBar**: its colour tokens and Noto fonts, with sindoor kept for "today"
   and holidays as in the app. UI work is checked against Vercel's
   [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines).
8. **No tracking.** No analytics script or cookies at launch. Cloudflare's own request metrics are
   enough to start; anything more needs its own decision.

## Consequences

- A release of a port that changes its version means one line in `ports.ts`, in the same PR as the
  hub README.
- The hub CI gains a `site` workflow, run only when `site/` changes.
- Docs and READMEs can drift in wording. The site holds the overview and the cross-language
  concepts; per-port detail stays in each repository, and the language pages link to it.
- Workers Builds needs the Cloudflare GitHub app on `sanamhub/nepdate`, which the owner grants once
  in the Cloudflare dashboard.

## Alternatives considered

- **Fumadocs (Next.js)**: the look many new docs sites use, but a Next static export is a heavier
  toolchain for a site with no server code.
- **VitePress or Docusaurus**: Vue-based or React-heavy; a distinctive landing page is more work in
  either.
- **Mintlify or another hosted platform**: closed source, paid beyond a starter plan, and the content
  would live outside the repository.
- **`docs.nepdate.com`**: splits one small site across two hosts for no gain.
- **A separate `nepdate-site` repository**: one more repository to keep in step with the hub,
  which already holds the data and spec the site describes.
- **GitHub Actions with a Cloudflare API token**: works, but stores a token in GitHub for what
  Workers Builds does without one.
