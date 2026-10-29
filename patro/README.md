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
src/lib/patro.test.ts         the facts the pages work out themselves (paksha, cleaned names)
src/components/MonthView.astro  a month: moon band, grid, holidays and events
src/components/Moon.astro       the moon of a day, drawn from its tithi
src/pages/                    home, [year], [year]/[month], [year]/[month]/[day], holidays.ics
src/scripts/today.ts          rings today in Nepal and keeps the home page on the current month
src/styles/patro.css          the patro's styles; the tokens are site/src/styles/tokens.css
```

The tokens, fonts (`site/fonts.mjs`), logo and valley drawing are read from `../site`, and the
theme switch from `../web`, so a change to the look is made once. CI builds this site when any of
them changes. None of them needs `site/`'s packages, so this site builds with only its own installed.

## Data

Every page is built from the pinned `nepdate-core` and `nepdate-patro` packages: the site shows
what a developer gets. The paksha is not in the data; `src/lib/patro.ts` works it out from the
order of the tithis, and its tests cover the cases the data has (a tithi on two days, a skipped
Purnima, and years that mark krishna-paksha tithis with "(K)").
