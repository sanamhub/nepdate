# C# NepDate baseline

Time and allocation of the NepDate NuGet package 2.0.7 on operations B1 to B8 of
[`spec/BENCHMARK.md`](../../spec/BENCHMARK.md), measured with [`tools/dotnet-bench`](../../tools/dotnet-bench/README.md).
Every port copies its "C# NepDate" column from the .NET 10 column below. How NepDate gets these
numbers is in [`docs/research/dotnet-internals.md`](../research/dotnet-internals.md).

## Machine and versions

| Item | Value |
|---|---|
| CPU | 12th Gen Intel Core i5-12500H (4 performance + 8 efficiency cores, 16 threads, base 3.1 GHz) |
| RAM | 31.7 GB |
| OS | Windows 11 Home 10.0.26300 (build 10.0.26300.9550) |
| Power plan | Ultimate Performance |
| Affinity | logical CPU 2 (mask `0x4`), set by the BenchmarkDotNet job (`WithAffinity`) |
| .NET SDK | 10.0.401 |
| Runtimes | .NET 10.0.12 (10.0.1226.42308) and .NET 8.0.31 (8.0.3126.42015), X64 RyuJIT x86-64-v3 |
| BenchmarkDotNet | 0.15.8, default job, `[MemoryDiagnoser]` |
| NepDate | 2.0.7 from nuget.org (the `lib/net8.0` assembly is used on both runtimes) |
| Date of run | 2026-10-09 (rerun with no other jobs; first run 2026-10-07) |

## Command

From the repo root, Release build, no debugger attached:

```
dotnet run -c Release -f net10.0 --project tools/dotnet-bench -- --filter "*" --artifacts <out-dir>
```

The raw BenchmarkDotNet reports are in [`raw/2026-10-09-dotnet-report-github.md`](raw/2026-10-09-dotnet-report-github.md)
and [`raw/2026-10-09-dotnet-report.csv`](raw/2026-10-09-dotnet-report.csv); the first run's are the
`2026-10-07` files next to them.

## Results

Time and bytes are per single operation (`OperationsPerInvoke = 64`). For B8 one operation is a
whole month grid of 29 to 32 days. Error is BenchmarkDotNet's half-width of the 99.9 % confidence
interval. "0" means BenchmarkDotNet measured no allocation.

| ID | Operation | .NET 10 mean ns/op | error ns | bytes/op | .NET 8 mean ns/op | error ns | bytes/op |
|---|---|---:|---:|---:|---:|---:|---:|
| B1 | BS to AD | 13.29 | 0.26 | 0 | 12.57 | 0.09 | 0 |
| B2 | AD to BS | 18.64 | 0.22 | 0 | 22.59 | 0.23 | 0 |
| B3 | add 1000 days | 17.50 | 0.19 | 0 | 23.48 | 0.37 | 0 |
| B4 | add 13 months, Clamp | 18.85 | 0.23 | 0 | 22.75 | 0.45 | 0 |
| B5 | long format, Nepali, weekday | 153.02 | 4.63 | 435 | 190.62 | 3.77 | 435 |
| B6 | strict parse `YYYY/MM/DD` | 21.55 | 0.39 | 0 | 27.65 | 0.55 | 0 |
| B7 | patro info | 47.93 | 0.90 | 51 | 56.94 | 1.09 | 51 |
| B8 | patro month grid | 3,132.66 | 53.87 | 1,429 | 3,567.93 | 67.16 | 1,429 |

The first run (2026-10-07, other jobs active on the machine) gave .NET 10 B1 13.48, B2 19.54, B3
19.84, B4 21.71, B5 208.35, B6 25.67, B7 47.49 and B8 3,256.05 ns. The table above replaces it;
ports copy only the table above.

## Notes on the numbers

- B7 allocates only on days with events: two `string[]` per call (Nepali and English names). 41 of
  the 64 patro inputs have events, and `2 × (24 + 8n)` bytes summed over them is 3280 bytes, or
  51.25 bytes per operation, which matches the measured 51 B.
- B5 allocates on every call (seven heap objects, listed in the research note).
- B8 is 29 to 32 calls of B7 plus as many BS to AD constructions per grid; its allocation is the same
  event arrays, summed over the month.
- The rerun had no other jobs on the machine. B5 is still the noisiest row (standard deviation
  13.5 ns on .NET 10), which is normal for an operation that allocates seven objects.
