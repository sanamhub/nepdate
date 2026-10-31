# patro.nepdate.com

The Nepali calendar, decided in [ADR-0006](../docs/adr/0006-patro-site.md): a page for every BS
month from 1901 to 2199, a page for every day the patro data covers, and a page per year with its
public holidays and an `.ics` file of them. [Astro](https://astro.build), built to static files
and served by a Cloudflare Worker, in the same design as [nepdate.com](../site).

## Run it

Node 22.12 or later.

```sh
npm ci
npm run dev      # http://localhost:4321
npm run check    # types, and the data tests in src/lib/patro.test.ts
npm run build    # dist/, about 6,300 pages
```

## Layout

```
src/lib/patro.ts              what a day is: dates, tithi and paksha, holidays, events
src/lib/i18n.ts               the two languages: Nepali (the default) and English
src/lib/render.ts             every view as HTML: month grid, year and decade zoom, day card, details
src/lib/*.test.ts             the facts the pages work out themselves, and what the views contain
src/components/App.astro      the patro: the month filling the screen, today's card, go to date
src/scripts/app.ts            the patro in the browser: today in Nepal, language, zoom, cards, keys
src/pages/                    home, [year], [year]/[month], [year]/[month]/[day], holidays.ics
src/styles/patro.css          the patro's styles; the tokens are site/src/styles/tokens.css
```

The home page and every month page are the same app. Each is built in Nepali from
`lib/render.ts`, so it reads without JavaScript and search engines see the month; in the browser
`scripts/app.ts` renders the same functions again for today in Nepal and the visitor's language,
which it stores under `patro-lang`. A click or a hover on a day opens its card in place (a sheet on
a phone); the title zooms out to the year and the decade, as in MitiBar.

Keys: arrow keys move between days (or months and years when zoomed out), Enter opens a day,
PageUp and PageDown change the month, T goes to today, Ctrl+G opens go to date, minus zooms out,
Escape closes a card or zooms back in. A sideways swipe or trackpad swipe changes the month and a
trackpad pinch zooms.

The tokens, fonts (`site/fonts.mjs`), logo and valley drawing are read from `../site`, and the
theme switch from `../web`, so a change to the look is made once. CI builds this site when any of
them changes. None of them needs `site/`'s packages, so this site builds with only its own installed.

## Data

Every page is built from the pinned `nepdate-core` and `nepdate-patro` packages: the site shows
what a developer gets. The paksha is not in the data; `src/lib/patro.ts` works it out from the
order of the tithis, and its tests cover the cases the data has (a tithi on two days, a skipped
Purnima, and years that mark krishna-paksha tithis with "(K)").
