# ADR-0012: Import month lengths from C# NepDate's month table

- **Status:** accepted
- **Date:** 2026-11-17
- **Approved by:** Sanam
- **Amends:** [ADR-0002](0002-canonical-data-and-upstream-first.md) decision 5

## Context

ADR-0002 decision 5 says `tools/extract_from_csharp.py` imports from C# NepDate and cross-validates
its two conversion tables, `NepaliToEnglish` and `EnglishToNepali`, against each other and against
the metadata offsets.

An open upstream pull request (number 28, branch `perf/serial-core`) deletes both conversion tables.
It adds `Core/Dictionaries/MonthTable.cs` instead: `MonthTable.Start` holds the day number of the
first day of every BS month, counted from 1901-01-01 BS = 1844-04-11 AD, and ends with
`TotalDays`. The constants `MinYear`, `MaxYear`, `MonthCount` and `TotalDays` describe the array.
This is the serial-day model of `spec/ALGORITHM.md`. The metadata files (`CalendarOffsets`,
`CalendarStrings`, `TithiData`, `HolidayData`, `EventData`) do not change.

Once that change merges, decision 5 can no longer be met as written: there is only one calendar
table left to read, and nothing upstream to cross-check it with in the same form.

## Decision

1. **The importer reads whichever layout the checkout has.** With `MonthTable.cs` it takes month
   lengths as differences of `MonthTable.Start` and anchors day 0 at 1844-04-11. Without it, it
   reads `NepaliToEnglish` and cross-checks `EnglishToNepali` as before.
2. **The month table is checked on its own terms.** Exactly 3588 months, each 29 to 32 days, the
   first entry 0, the last entry equal to `TotalDays`, and `MinYear`, `MaxYear` and `MonthCount`
   equal to 1901, 2199 and 3588. `CalendarOffsets.MonthStart` is still checked against the
   derived month starts.
3. **When both layouts are present they must agree month for month.** When neither is present, or
   only one of the two old files, the import fails with a message that names the files.
4. **The exhaustive check stays the end-to-end proof.** `tools/csharp-exhaustive` uses only the
   public C# API, so it runs unchanged against either layout.

## Consequences

- The daily upstream sync keeps working when the pull request merges, with no hub change on that
  day.
- On the pull request branch, the import gives the same `data/` byte for byte as upstream `main`
  in the old layout, and the exhaustive check shows zero differences over all 109,212 days.
- The cross-check between two independent upstream tables is gone in the new layout. What
  remains is the month table's own checks, `CalendarOffsets`, and the exhaustive check against
  the running C# code.
- The old-layout code can be removed once no supported upstream commit uses it.

## Alternatives considered

- Keep a copy of the old tables in the hub to cross-check against: duplicates data the hub
  already holds in `data/`. Rejected.
- Read only the new layout: breaks the daily sync until the pull request merges. Rejected.
