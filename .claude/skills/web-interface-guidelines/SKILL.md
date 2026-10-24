---
name: web-interface-guidelines
description: Review or write web UI in this repository (site/) against Vercel's Web Interface Guidelines, with the NepDate overrides. Use before opening a pull request that changes site/src/pages, site/src/layouts, site/src/styles or site/src/scripts, and when asked to audit the site's accessibility, focus, forms, motion, typography or dark mode.
---

# Web interface guidelines for nepdate.com

The rules are in [guidelines.md](guidelines.md), copied unchanged from
[vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) at
commit `434b7f91364665f2f733b310ec54809bf8f37937` (MIT, [LICENSE](LICENSE)). Update by copying the
file again at a newer commit and changing that hash in the same pull request.

Use it with the `frontend-design` skill, which decides the look; this one checks the build quality.
The design decisions for the site are in `docs/adr/0005-website-on-nepdate-com.md`.

## How to review

1. Read the changed files under `site/src/`.
2. Check each against the rules in `guidelines.md`, with the overrides below.
3. Report findings as `file:line - problem`, grouped by file, in the format `guidelines.md` gives.
   Say "pass" for a file with none.

## NepDate overrides

These win where they disagree with `guidelines.md`:

- **Sentence case** for headings and buttons, not Title Case (house writing style).
- **No em dashes** in copy; use a comma, a colon or two sentences.
- **Sindoor** (`--nd-sindoor`) marks today and public holidays only, as in MitiBar. Never use it for
  buttons, links, errors or decoration.
- **Dates on the site come from `nepdate-core` or `nepdate-patro`**, never from hand-written strings
  or `Date` arithmetic. Gregorian display may use `Intl.DateTimeFormat`.
- **Devanagari text** carries `lang="ne"` so it gets Noto Sans Devanagari and correct line height.
- **Versions, package names and install lines** come from `site/src/data/ports.ts`; `npm run check`
  enforces the version part.
- The site is static with no React, so rules about hydration, `useState` and `nuqs` don't apply.
