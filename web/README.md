# web

Code shared by the two websites, [nepdate.com](../site) and [patro.nepdate.com](../patro)
(ADR-0006, ADR-0010). It sits outside both projects because a component under `site/` is compiled with
`site/tsconfig.json`, which needs `site/`'s own packages; here it needs none, so each site builds
with only its own dependencies installed.

| File | What it is |
|---|---|
| `ThemeToggle.astro`, `theme.ts` | the light and dark switch |
| `FontLoader.astro` | how the fonts load: a first visit paints with the system's fonts and caches the NepDate fonts once the page is idle; later visits use them from the first paint |
| `agent-worker.js`, `agent-worker.test.js` | the small Worker that serves Markdown and JSON to agents, and its tests |
| `agent-check.mjs` | the agent-readiness pull request check |
| `lighthouse.mjs` | the Lighthouse pull request check; each site's `scripts/lighthouse.mjs` passes it the pages and its own copy of Lighthouse |

Styles, fonts and drawings are plain files and stay in `site/`, which `patro/` reads by path.
