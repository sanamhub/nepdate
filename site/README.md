# nepdate.com

The NepDate landing page and documentation, decided in
[ADR-0005](../docs/adr/0005-website-on-nepdate-com.md). [Astro](https://astro.build) with
[Starlight](https://starlight.astro.build) for the docs, built to static files and served by a
Cloudflare Worker.

## Run it

Node 22.12 or later.

```sh
npm ci
npm run dev      # http://localhost:4321
npm run check    # types, and no version typed outside src/data/ports.ts
npm run build    # dist/, with every internal link checked
```

## Layout

```
src/pages/index.astro       the landing page
src/layouts/Landing.astro   its header and footer
src/scripts/                landing page behaviour: today's date, tabs, copy, converter
src/content/docs/docs/      the docs, served under /docs/
src/data/ports.ts           every version, package name, install line and cross-language snippet
src/data/benchmarks.ts      benchmark numbers, copied from each port's docs/benchmarks.md
src/components/             Starlight's Head with the fonts, and Fonts.astro for both shells
src/components/landing/     the landing page's drawings: ports, patro, checks, MitiBar
fonts.mjs                   the three font families for Astro's font API (fontsource, self-hosted)
src/styles/tokens.css       colours, fonts, radius, type scale and rhythm, shared by both (from MitiBar's design tokens)
src/styles/starlight.css    Starlight mapped onto the tokens
src/styles/landing.css      the landing page
src/styles/hero-motion.css  the hero's opening sequence, inlined with the page
src/styles/landing-art.css  the drawings and their scroll motion, linked below the hero to keep the HTML small
public/_headers             security headers and asset caching
wrangler.jsonc              the Worker that serves dist/
```

## Rules

- A new release: change the version in `src/data/ports.ts`. Nothing else names a version, and
  `npm run check` fails if a page does.
- Benchmark numbers change only with the port's report they come from. The build fails if a number
  says a port is not faster than a library it claims to beat.
- Code samples are copied from the port's README, which its CI runs, or built only from names in its
  `docs/API.md`. Run any new cross-language snippet before it goes on the site.
- UI changes are checked against Vercel's
  [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines). Sindoor red
  is for today and holidays only.
- No analytics script and no cookies (ADR-0005).

## Deploy

Cloudflare Workers Builds watches this repository with `site` as its root directory: `npm ci && npm
run build`, then `npx wrangler deploy` on `main`. Each pull request gets a preview URL in its checks.
The `site` workflow in `.github/workflows/` is the gate before merge.
