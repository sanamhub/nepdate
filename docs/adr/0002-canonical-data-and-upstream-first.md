# ADR-0002: Canonical, language-neutral calendar data, upstream first

- Status: Accepted
- Date: 2026-09-24 (moved from nepdate-rust ADR-0003 on 2026-09-25)
- Deciders: Sanam Pakuwal

## Context

The Bikram Sambat (BS) calendar has no closed-form formula: month lengths (29–32
days) are published by the Nepal Panchanga Nirnayak Samiti and must be looked up.
The C# NepDate library (MIT, https://github.com/RajuPrasai/NepDate) stores this as
C# source code in two redundant tables:

| C# table | Rows | Row meaning |
|---|---|---|
| `NepaliToEnglish.data` | 3588 (BS 1901–2199 × 12) | `(bsMonthLength, adYear, adMonth, adDay)` where the AD date is the **last** day of that BS month |
| `EnglishToNepali.data` | 3589 (AD 1844-04 … 2143-04) | `(adMonthLength, bsYear, bsMonth, bsDay)` where the BS date is the **last** day of that AD month |

Plus metadata (BS 2077–2084 only): tithi (lunar day), public holidays and events,
keyed by "day offset since 2001-01-01 BS", with a shared string pool.

Copying C# arrays into every language is error-prone and hides the fact that both tables
encode the same information.

## Decision

1. `data/` is the **single source of truth** for all ports (ADR-0001).
2. The calendar is stored as **month lengths only** plus one epoch anchor:
   - `data/calendar/bs-calendar.json`
     - `epoch`: `{"bs": "1901-01-01", "ad": "1844-04-11"}`
     - `month_lengths`: `{"1901": [31, 31, 32, ...12 values], ..., "2199": [...]}`
   - Everything else (AD↔BS maps, month start offsets, year lengths) is *derived*.
3. Metadata is stored per BS year in `data/patro/<year>.json`:
   ```json
   { "schema": 1, "year": 2081,
     "days": { "2081-01-01": { "tithi": {"np": "...", "en": "..."},
                              "holiday": true,
                              "events": [{"np": "...", "en": "..."}] } } }
   ```
   Keys are ISO-like BS dates (`YYYY-MM-DD`), not offsets, so humans can review diffs
   and the file stays valid if the calendar range changes. Days without data are omitted.
4. Every file carries a `schema` integer and a `source` object (repo, commit, license,
   import date) for provenance.
5. `tools/extract_from_csharp.py` imports from C# NepDate and **cross-validates** the two C#
   tables and the metadata offsets against each other (all 3588 BS month-ends and 3588 AD
   month-ends agree; see the script header).
6. **Upstream first.** C# NepDate stays the upstream for calendar data, because the
   maintainers work together and every port should agree with it. Data changes (next year's
   holidays, a corrected month length) land in NepDate first. The weekly `upstream-sync.yml`
   re-imports and opens a PR here (`docs/runbooks/data-update.md`). Editing `data/` by hand is
   allowed only when upstream can't take a fix in time, and the PR must say so. The same fix
   is then sent upstream.
7. `spec/vectors/` are conformance vectors every port must pass. `month-boundaries.csv` lists
   the first and last day of every BS month with its AD date and weekday (7176 rows). It is
   derived from `data/` by `tools/make_vectors.py` (hub task H1-01).

## Consequences

- A port needs `data/`, `spec/`, and a small table generator in its own language. No other
  language's toolchain.
- The redundant `EnglishToNepali` table disappears; AD→BS becomes arithmetic plus a search
  over derived month starts (`spec/ALGORITHM.md`).
- The MIT license of NepDate requires keeping its copyright notice with the data.
  `data/NOTICE` does this.
- JSON is ~0.7 MB, mostly metadata strings. It is read **only at dev time** by each port's
  generator. Nothing parses JSON at runtime: ports ship compiled constant tables (Rust:
  calendar ≈ 1.2 KB, events ≈ 100 KB, in the separate `nepdate-patro` package, ADR-0004).

## Alternatives considered

- CSV for everything: fine for lengths, awkward for nested events. Rejected.
- Keep day offsets as keys in metadata: compact but unreadable, and ties metadata to
  one arbitrary base year. Rejected.
- Binary format: not reviewable in PRs. Rejected.
