# tools/: one-off importers (not part of the build)

| Tool | Run from repo root | Purpose |
|---|---|---|
| `extract_from_csharp.py` | `py tools/extract_from_csharp.py <path-to-NepDate-clone> --commit <sha>` | Imports C# NepDate tables into `data/` and cross-validates them. Run weekly by `upstream-sync.yml` (ADR-0002 §6); by hand only to test the importer. It leaves a file untouched when its content didn't change. |
| `csharp-golden/` | `dotnet run --project tools/csharp-golden -- spec/vectors/csharp-golden` | Records the behaviour of the NepDate NuGet package (version pinned in the `.csproj`) as golden TSV files (ADR-0003, `spec/PARITY.md`). Needs the .NET 8 SDK. Regenerating against a new NepDate version is a human decision. |
| `csharp-exhaustive/` | `dotnet run -c Release --project tools/csharp-exhaustive -p:NepDateSource=<NepDate-clone> -- <out-dir>` | Builds C# NepDate from source and writes what it computes for every BS day, every AD day and every metadata day. Needs the .NET 8 SDK. |
| `compare_exhaustive.py` | `py tools/compare_exhaustive.py <out-dir>` | Compares that output with `data/` using only Python's `datetime`. Exits 1 on any difference. Last run: 0 differences on `cb05cb65`. |
| `make_vectors.py` (task H1-01) | `py tools/make_vectors.py` | Regenerates `spec/vectors/month-boundaries.csv` from `data/`. |
| `dotnet-bench/` (task H6) | `dotnet run -c Release -f net10.0 --project tools/dotnet-bench -- --filter "*" --artifacts <dir>` | C# NepDate baseline for `spec/BENCHMARK.md` B1–B8 (BenchmarkDotNet, pinned to logical CPU 2). Results: `docs/benchmarks/dotnet.md`. |
| `data_sanity.py` (task H1-04) | `py tools/data_sanity.py` | Runs the checks behind `data/README.md` "Known data questions"; exits 1 on a finding not in `data/known-questions.json`. |
| `make_ics.py` (task H4-01) | `py tools/make_ics.py` | Writes `holidays.ics` from `data/patro/`. |
| `catalog_csharp_tests.py` (task H5) | `py tools/catalog_csharp_tests.py <path-to-NepDate-clone> [--check]` | Writes `spec/vectors/csharp-tests/catalog.tsv`, one row per `[Fact]` and per `[InlineData]` of C# NepDate's tests, with the phase from `tools/csharp_tests_phase.tsv` (reviewed by the human; an unmapped test fails the tool). `--check` exits 1 when the committed file differs. Last run: 542 rows (395 + 147) on `cb05cb65`. |
| `data_status.py` (task H1-02) | `py tools/data_status.py [--strict] [--today YYYY-MM-DD]` | Prints how far tithi, holiday and event data reach; exits 1 when holidays end within 183 days, and with `--strict` also when tithi or events do. |

All tools only read public MIT-licensed NepDate code/packages.
