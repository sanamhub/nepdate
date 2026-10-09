# tools/: one-off importers (not part of the build)

| Tool | Run from repo root | Purpose |
|---|---|---|
| `extract_from_csharp.py` | `py tools/extract_from_csharp.py <path-to-NepDate-clone> [--commit <sha>] [--summary <file>]` | Imports C# NepDate tables into `data/` and cross-validates them. Run weekly by `upstream-sync.yml` (ADR-0002 §6); by hand only to test the importer. A file is rewritten only when its content, ignoring `source`, changed. Writes `data/UPSTREAM` (the commit, default the clone's `HEAD`) and `data/NOTICE` from `NOTICE.template`. `--summary` writes the changed BS months as a Markdown list. Run `make_vectors.py` afterwards. |
| `csharp-golden/` | `dotnet run --project tools/csharp-golden -- spec/vectors/csharp-golden` | Records the behaviour of the NepDate NuGet package (version pinned in the `.csproj`) as golden TSV files (ADR-0003, `spec/PARITY.md`). Needs the .NET 8 SDK. Regenerating against a new NepDate version is a human decision. |
| `csharp-exhaustive/` | `dotnet run -c Release --project tools/csharp-exhaustive -p:NepDateSource=<NepDate-clone> -- <out-dir>` | Builds C# NepDate from source and writes what it computes for every BS day, every AD day and every metadata day. Needs the .NET 8 SDK. |
| `compare_exhaustive.py` | `py tools/compare_exhaustive.py <out-dir>` | Compares that output with `data/` using only Python's `datetime`. Exits 1 on any difference. Last run: 0 differences on `cb05cb65`. |
| `make_vectors.py` (task H1-01) | `py tools/make_vectors.py [--check]` | Regenerates `spec/vectors/month-boundaries.csv` from `data/` with the calendar functions in `spec/reference/nepcal.py`. `--check` exits 1 when the committed file differs. |
| `dotnet-bench/` (task H6) | `dotnet run -c Release -f net10.0 --project tools/dotnet-bench -- --filter "*" --artifacts <dir>` | C# NepDate baseline for `spec/BENCHMARK.md` B1–B8 (BenchmarkDotNet, pinned to logical CPU 2). Results: `docs/benchmarks/dotnet.md`. |
| `data_sanity.py` (task H1-04) | `py tools/data_sanity.py` | Runs the checks behind `data/README.md` "Known data questions"; exits 1 on a finding not in `data/known-questions.json`. |
| `make_ics.py` (task H4-01) | `py tools/make_ics.py` | Writes `holidays.ics` from `data/patro/`. |
| `catalog_csharp_tests.py` (task H5) | `py tools/catalog_csharp_tests.py <path-to-NepDate-clone> [--check]` | Writes `spec/vectors/csharp-tests/catalog.tsv`, one row per `[Fact]` and per `[InlineData]` of C# NepDate's tests, with the phase from `tools/csharp_tests_phase.tsv` (reviewed by the human; an unmapped test fails the tool). `--check` exits 1 when the committed file differs. Last run: 542 rows (395 + 147) on `cb05cb65`. |
| `shared_sync.py` (task H3) | `py tools/shared_sync.py <spoke-dir> [--rev <sha>] [--check]` | Copies `data/` and `spec/` of a hub commit (default `main`, through `git archive`) into a spoke's `shared/` and writes `shared/VERSION`; `--check` exits 1 when `shared/` differs from the hub at `VERSION`. The local twin of the `shared-sync` and `shared-check` workflows. |
| `data_status.py` (task H1-02) | `py tools/data_status.py [--strict] [--today YYYY-MM-DD]` | Prints how far tithi, holiday and event data reach; exits 1 when holidays end within 183 days, and with `--strict` also when tithi or events do. `--today` (AD) replaces today's date. CI runs it as information only. |

Tests for the tools live in `tools/tests/` (`py -m unittest discover -s tools/tests`, run by `scripts/ci.sh`).

All tools only read public MIT-licensed NepDate code/packages.
