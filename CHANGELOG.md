# Changelog

Changes to the shared data, spec and tools. Ports keep their own changelogs.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This repository has no
releases; ports pin a commit in `shared/VERSION` (ADR-0001).

## [Unreleased]

### Added
- Canonical data imported from NepDate (C#) at commit `cb05cb65` and cross-validated:
  `data/calendar/bs-calendar.json`, `data/patro/2077.json` … `2084.json`.
- Specs: algorithm, formatting, parsing, metadata, and C# parity with deviations D-01 … D-15.
- Conformance vectors: `spec/vectors/month-boundaries.csv`, `spec/vectors/parse.tsv`,
  C# golden vectors from NepDate 2.0.7 in `spec/vectors/csharp-golden/`.
- Hub-and-spoke layout (ADR-0001): this repository holds what every port shares; each
  language lives in its own `nepdate-<lang>` repository.
- Plan for the weekly upstream sync from C# NepDate (`docs/plan/00-ROADMAP.md`, H2).
- Exhaustive check against the C# code (`tools/csharp-exhaustive`, `tools/compare_exhaustive.py`):
  all 109,212 days in both directions and all 2408 metadata days match.
- Known data question recorded: BS 2087 has 367 days and 2090 has 364 (`data/README.md`).
- Known data question recorded: BS 2084 New Year is named "New Year 2083" (U-08); `tools/data_sanity.py`
  checks the year in every BS New Year event name.

- Port plan shared by every port: phases 0–5 with acceptance criteria (`spec/PORT-PLAN.md`).
- Ports table lists Swift and Kotlin (for the mobile apps) and `nepdate-mobile`.
- Upstream proposals U-01 to U-07 for C# NepDate, with a size breakdown of its DLL
  (`docs/upstream/proposals.md`); metadata provenance recorded as an open question.
- Handover guide for implementing all repositories in order (`docs/handover.md`).
- Plan H4: publish `holidays.ics` to GitHub Pages; proposal for data schema 2 (`scope`, `tbd`).
- Catalogue of C# NepDate's own tests (H5-01): `spec/vectors/csharp-tests/catalog.tsv`, 542 rows
  at `cb05cb65`, written by `tools/catalog_csharp_tests.py` with phases from
  `tools/csharp_tests_phase.tsv`.
- C# baseline rerun on an idle machine (H6-03, `docs/benchmarks/dotnet.md`): B5 is 153 ns, not 208,
  and B3, B4 and B6 are 2 to 4 ns faster than the first run.

- Tools (H1): `spec/reference/nepcal.py` (calendar functions shared by the checks and tools),
  `tools/make_vectors.py --check`, `tools/data_status.py` (how far patro data reaches; exit 1 under
  183 days of holidays), `tools/data_sanity.py` with `data/known-questions.json`, and unit tests in
  `tools/tests/`. CI runs them through `scripts/ci.sh`.
- `data/UPSTREAM`: the NepDate commit last imported.
- Community files, issue templates and `ci.yml` (H0).
- `spec/PATRO.md`: tithi names ending in `*` / " (K)" are shown unchanged; their meaning is open
  question U-09.

### Changed
- `scripts/ci.sh` reports a skipped check in its last line (`ci: 4 checks passed, 1 skipped
  (workflow lint)`) instead of printing only the passed count when actionlint is missing.
- The importer rewrites a data file only when its content changed, writes `--summary`, and renders
  `data/NOTICE` from `tools/NOTICE.template`. `verify_vectors.py` runs from any directory.
- The second package is now called the **patro** (पात्रो: tithi, holidays, events), named by each
  ecosystem's conventions (ADR-0004, rewritten with a naming table): `data/patro/`,
  `spec/PATRO.md`. Adds the C++ port `nepdate-cpp`.
- New `spec/BENCHMARK.md` (reference machine, the 64 dates, operations B1–B8, targets, C# baseline)
  and hub tasks H5 (catalogue of C# NepDate's own tests) and H6 (C# baseline benchmark).
- Spec: lenient parsing accepts only ASCII and Devanagari digits and states its `NumberTooLong` and
  empty-input results (`spec/PARSING.md`, reference parser, 2 new rows in `parse.tsv`); ALGORITHM
  §3 defines `InvalidGregorian` versus `OutOfRange`; §8a has worked examples; PORT-PLAN defines the
  64 benchmark dates and the artefact for the core and patro split check.
- Plan: H2 split into a read-only `check` job and a `publish` job; `data/UPSTREAM` records the last
  imported commit; reusable workflows are pinned by SHA with named secrets; `holidays.ics` details
  (one event per holiday day, deterministic `DTSTAMP`); `data_status.py --today`.
- Events (tithi, holidays, events) ship in a separate package `nepdate-patro` in every port
  (ADR-0004). `data/meta/` is now `data/patro/`, `spec/META.md` is now `spec/PATRO.md`, and
  PORT-PLAN phase 4 checks the split. PARITY D-13 records that C# keeps them in one package.
- Spoke repositories use the full language name: `nepdate-rust`, `nepdate-typescript`,
  `nepdate-python` (were `-rs`, `-ts`, `-py`); registry package names stay `nepdate` where free
  (hub ADR-0001).
- Deviation D-01 (`spec/PARITY.md`) now covers languages with a forced zero value (Go): the zero
  value means "no date" and every operation on it fails.
