# ADR-0006: patro.nepdate.com, a calendar site built from patro/ in the hub

- **Status:** proposed
- **Date:** 2026-10-29
- **Approved by:** pending (Sanam)
- **Amends:** [ADR-0005](0005-website-on-nepdate-com.md) decision 3 (one host)

## Context

People in Nepal and abroad open a patro (a Nepali calendar) to see today's date, a month with its
tithi and public holidays, and the day of a festival. The sites they use today are heavy with ads,
slow on a phone, and hard to read. The hub already holds the calendar data every port ships, and
`nepdate-core` and `nepdate-patro` already answer every question such a page asks. The owner wants
`patro.nepdate.com` to be the patro people choose: clean, fast, accessible, readable on a phone, in
the same design as nepdate.com.

ADR-0005 put the site on one host. A calendar is a different product with a different audience, and
it has thousands of pages (a month page for every BS year, a day page for every day with patro
data), which would slow the docs build and its link check.

## Decision

1. **A second Astro project, `patro/`, beside `site/` in the hub**, served by its own Cloudflare
   Worker `nepdate-patro` on `patro.nepdate.com`, built by Workers Builds with root `/patro`, the
   same way ADR-0005 builds `site/`: static files, no Worker code, no token in GitHub. Previews per
   pull request.
2. **One design system.** `patro/` imports the colour tokens, the fonts setup and the valley skyline
   from `site/` by relative path, so a change to the look is made once. The patro has its own
   layout and components.
3. **Pages, all static, all built from the published packages:**
   - a month page for every BS month, 1901 to 2199 (`/2083/07/`), with AD dates, tithi, public
     holidays and events where the patro has them;
   - a day page for every day the patro covers (`/2083/07/12/`);
   - a year page with its public holidays (`/2083/`), and an `.ics` file of them;
   - the home page is this month, made current in the browser from the build.
   The packages are pinned like the site's, so the site shows exactly what a developer gets.
4. **Only what the data says.** Each day shows the BS and AD dates, the weekday, the tithi, the
   paksha (from the order of tithis in the data), public holidays and events. Computed values are
   added only with a check behind them: sunrise and sunset in Kathmandu (NOAA's solar equations,
   tested against a published table) and the moon's phase drawn from the tithi. No nakshatra,
   muhurta, rashifal or auspicious dates until there is a source for them. A day outside the patro
   data says so instead of showing an empty cell as an ordinary day.
5. **Nepali and English on the same page.** Dates and names in Devanagari first, English beside
   them, one URL per page.
6. **Fast and private by rule.** No ads, analytics, cookies or account. Each page's HTML stays inside
   the first network round trip (about 14 KB compressed), JavaScript only adds behaviour to the
   built page, and Lighthouse is checked on mobile and desktop before release.

## Consequences

- The hub runs two site builds; each runs only when its own directory (or the shared files) changes.
- A data update in the hub reaches the patro site when the pinned `nepdate-patro` version moves.
- `patro/` depends on files inside `site/`. Moving or renaming them breaks the patro build, which
  the CI catches.
- The owner adds the `nepdate-patro` Worker and its Workers Builds connection, and the
  `patro.nepdate.com` custom domain, in Cloudflare.

## Alternatives considered

- **Pages under nepdate.com/patro/ in `site/`**: one build, but thousands of pages in the docs build,
  and a host-based rewrite would need Worker code to serve `patro.nepdate.com`.
- **`site/patro/` as a nested project**: the same separation, but tools that walk `site/` (type
  check, formatter) would also walk the nested project.
- **A client-side app with one page**: smaller build, but no page per month or day for search
  engines and answer engines to read, and nothing to show without JavaScript.
