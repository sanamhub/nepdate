# Changelog

Changes to the shared data, spec and tools. Ports keep their own changelogs. This repository has
no releases; ports pin a commit in `shared/VERSION` (ADR-0001). Format:
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Calendar and patro data imported from C# NepDate at `cb05cb65` and cross-validated:
  `data/calendar/bs-calendar.json` and `data/patro/2077.json` to `2084.json`.
- Specs for the algorithm, formatting, parsing, patro data and C# parity, with deviations D-01 to
  D-15.
- Conformance vectors: month boundaries, parse cases, and golden rows recorded from NepDate 2.0.7.
- A catalogue of C# NepDate's own tests (`spec/vectors/csharp-tests/catalog.tsv`, 542 rows), each
  mapped to the porting phase that covers it.
- `spec/PORT-PLAN.md` (phases and acceptance criteria for a new port) and `spec/BENCHMARK.md`
  (operations, dates and targets, with the C# baseline in `docs/benchmarks/dotnet.md`).
- An exhaustive comparison with the C# code: all 109,212 days in both directions and all 2408
  patro days match.
- Tools: the C# importer, the golden vector generator, `make_vectors.py`, `data_status.py` (how far
  patro data reaches; exits 1 under 183 days of holidays), `data_sanity.py` with
  `data/known-questions.json`, `shared_sync.py`, and unit tests. `scripts/ci.sh` runs them.
- Reusable `shared-check` and `shared-sync` workflows for the ports.
- Known data questions in `data/README.md`: BS 2087 has 367 days and 2090 has 364, the BS 2084 New
  Year event is named "New Year 2083" (U-08), and tithi names ending in `*` or " (K)" are shown
  unchanged until their meaning is known (U-09).
- Draft upstream proposals for C# NepDate (`docs/upstream/proposals.md`), with a size breakdown
  of its DLL.
- `.github/workflows/upstream-sync.yml` and `tools/upstream_sync.py`: the hub re-imports C# NepDate
  every day at 03:15 UTC and on demand, checks the result against the spec, `data_sanity.py` and
  the C# code itself, opens or updates the PR on `bot/upstream-sync`, and opens one issue per
  finding. A new NepDate release on nuget.org is checked on every run. The checks and the one-time
  setup are in `docs/runbooks/data-update.md`.

### Changed

- The second package in every port is the patro (पात्रो: tithi, holidays, events), named by each
  ecosystem's conventions (ADR-0004). `data/meta/` became `data/patro/` and `spec/META.md` became
  `spec/PATRO.md`. PARITY D-13 records that C# keeps one package.
- Port repositories use the full language name (`nepdate-rust`, `nepdate-typescript`,
  `nepdate-python`); registry packages stay `nepdate` where the name is free (ADR-0001).
- Lenient parsing accepts only ASCII and Devanagari digits and states its `NumberTooLong` and
  empty-input results; ALGORITHM §3 separates `InvalidGregorian` from `OutOfRange`.
- Deviation D-01 covers languages with a forced zero value (Go): the zero value means "no date"
  and every operation on it fails.
- `scripts/ci.sh` reports a skipped check in its last line instead of counting only passed ones.
