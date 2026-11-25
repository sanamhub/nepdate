# C# NepDate baseline

Time and allocation of the NepDate NuGet package 2.1.0 on operations B1 to B8 of
[`spec/BENCHMARK.md`](../../spec/BENCHMARK.md), measured with [`tools/dotnet-bench`](../../tools/dotnet-bench/README.md).
The site's performance page compares every port with the .NET 10 column below; the ports' own
reports carry no C# numbers. How NepDate gets these
numbers is in [`docs/research/dotnet-internals.md`](../research/dotnet-internals.md).

The competitors are chosen by [BENCHMARK section 7](../../spec/BENCHMARK.md#7-choosing-competitors).
The hub's 64-date harness measures them, so their B1 and B2 numbers are directly comparable with the
NepDate row. The upstream single-date benchmark is kept at the end as a note on upstream's figures;
the site does not use it.

## Machine and versions

| Item | Value |
|---|---|
| CPU | 12th Gen Intel Core i5-12500H (4 performance + 8 efficiency cores, 16 threads, base 3.1 GHz) |
| RAM | 31.7 GB |
| OS | Windows 11 Home 10.0.26300 (build 10.0.26300.9974) |
| Power plan | Ultimate Performance (`5a4d4a58-bc7d-4df9-9eb7-5f61415ae0f6`), on AC |
| Affinity | logical CPU 2 (mask `0x4`), set by the BenchmarkDotNet job (`WithAffinity`) |
| .NET SDK | 11.0.100 (the project targets net10.0) |
| Runtimes | .NET 10.0.15 (10.0.1526.53008) and .NET 8.0.34 (8.0.3426.52217), X64 RyuJIT x86-64-v3 |
| BenchmarkDotNet | 0.15.8, default job, `[MemoryDiagnoser]` |
| NepDate | 2.1.0 from nuget.org (the `lib/net8.0` assembly is used on both runtimes) |
| Date of run | 2026-11-20 |
| CPU load before | 4.9 percent average, 9.7 peak (30 one-second samples, the idle gate) |
| CPU load during | 15.9 percent average, 63.2 peak (467 one-second samples over the 467 s run) |

The machine was otherwise idle: no other build, test suite or benchmark ran during this session. The
load is the whole-machine figure; each benchmark process is pinned to logical CPU 2, which accounts
for about 6 percent of it by itself. 35 of the 467 samples are above 30 percent (up to 63.2); the
longest bursts fall about 70 and 265 seconds in. The per-second samples are in
[`raw/2026-11-20-dotnet-cpu-samples.txt`](raw/2026-11-20-dotnet-cpu-samples.txt).

## Command

From the repo root, Release build, no debugger attached:

```
dotnet run -c Release -f net10.0 --project tools/dotnet-bench -- --filter "*" --artifacts <out-dir>
```

The job sets affinity and the Ultimate Performance GUID, and BenchmarkDotNet restores the active
plan after the run. The raw reports are
[`raw/2026-11-20-dotnet-report-github.md`](raw/2026-11-20-dotnet-report-github.md),
[`raw/2026-11-20-dotnet-report.csv`](raw/2026-11-20-dotnet-report.csv),
[`raw/2026-11-20-dotnet-competitors-report-github.md`](raw/2026-11-20-dotnet-competitors-report-github.md)
and [`raw/2026-11-20-dotnet-competitors-report.csv`](raw/2026-11-20-dotnet-competitors-report.csv).
The console log is [`raw/2026-11-20-dotnet-final.log`](raw/2026-11-20-dotnet-final.log).

## Results

Time and bytes are per single operation (`OperationsPerInvoke = 64`). For B8 one operation is a
whole month grid of 29 to 32 days. Error is BenchmarkDotNet's half-width of the 99.9 % confidence
interval. "0" means BenchmarkDotNet measured no allocation.

| ID | Operation | .NET 10 mean ns/op | error ns | bytes/op | .NET 8 mean ns/op | error ns | bytes/op |
|---|---|---:|---:|---:|---:|---:|---:|
| B1 | BS to AD | 5.60 | 0.10 | 0 | 5.98 | 0.12 | 0 |
| B2 | AD to BS | 5.90 | 0.11 | 0 | 6.08 | 0.11 | 0 |
| B3 | add 1000 days | 2.79 | 0.05 | 0 | 2.82 | 0.02 | 0 |
| B4 | add 13 months, Clamp | 2.45 | 0.04 | 0 | 2.89 | 0.03 | 0 |
| B5 | long format, Nepali, weekday | 29.96 | 0.39 | 69 | 32.62 | 0.64 | 69 |
| B6 | strict parse `YYYY/MM/DD` | 7.28 | 0.06 | 0 | 7.27 | 0.15 | 0 |
| B7 | patro info | 16.46 | 0.33 | 51 | 22.97 | 0.46 | 51 |
| B8 | patro month grid | 633.13 | 12.64 | 1,429 | 836.61 | 10.42 | 1,429 |

## Choosing the C# competitors

The candidates are the NuGet packages whose public API converts between Bikram Sambat and Gregorian
dates. Usage was read from the nuget.org search API and the nuget.org statistics report on
2026-11-02. The bar is 10,000 total downloads and 250 downloads in the last six weeks, first release
at least 12 months before 2026-11-02, a release or commit in the last 36 months, a license, not
archived or deprecated, and a build that runs on .NET 10.

| Package | Total downloads | Last 6 weeks | Verdict |
|---|---:|---:|---|
| DateConverterNepali | 104,001 | 379 | selected; first release 2024-06-26, last 2024-07-15, MIT |
| NepaliDateConverter.NETCORE | 96,853 | 487 | selected; first release 2019-04-02, last 2024-06-17, MIT or Apache-2.0 |
| NepaliCalendarBS | 23,397 | 1,111 | selected; first release 2021-04-22, last 2025-05-14, MIT |
| NepaliCalendarToolkit | 4,549 | 858 | fails the 10,000 total minimum |
| NepaliDateConverter | 15,076 | 93 | fails the 250 in six weeks minimum and has no release since 2015 |
| NepaliCalendar | 8,405 | 156 | fails both usage minimums and the package declares no license |
| NepaliDateConverter.Net | 7,777 | 68 | fails both usage minimums, has no release since 2017, and ships the same converter as NETCORE |
| NepaliCalendarCore | 3,500 | 85 | fails the 10,000 total minimum |
| DateConverter.Core | 3,035 | 56 | fails the 10,000 total minimum |
| NepaliDateConverter.netstandard | 1,717 | 34 | fails the 10,000 total minimum |
| BSDateConverter | 1,447 | 116 | fails the 10,000 total minimum and has no release in 36 months |
| BsadConverter | 688 | 72 | fails the 10,000 total minimum |
| BsadConverter.Tool | 678 | 24 | fails the 10,000 total minimum |
| NepaliDateConverterNetCore | 576 | 8 | fails the 10,000 total minimum and duplicates NETCORE |
| Common.NepaliDate.Converter | 644 | 23 | fails the 10,000 total minimum |
| OSN.NepaliCalendar | 223 | 223 | fails the 10,000 total minimum |
| NepaliUtility.Core | 213 | 29 | fails the 10,000 total minimum |
| MeroMiti | 85 | 1 | fails the 10,000 total minimum and the 12-month bar |

Only the three selected packages are in `CompetitorBenchmarks`. Their calls are the ones in
[`tools/dotnet-bench/README.md`](../../tools/dotnet-bench/README.md):
`DateConverter.GetDateInAD(y, m, d)` and `GetDateInBS(y, m, d)` for DateConverterNepali,
`NepaliCalendar.Convert_BS2AD("YYYY/MM/DD")` and `Convert_AD2BS(DateTime)` for NepaliCalendarBS,
and `DateConverter.ConvertToEnglish` and `ConvertToNepali` for NepaliDateConverter.NETCORE.

## Competitor results

Time is the .NET 10 mean per single conversion. "Agrees" is how many of the 64 results match the hub
calendar data, from `dotnet run -c Release -f net10.0 --project tools/dotnet-bench -- --agrees`.
Bytes/op is B1 / B2.

| Library | Version | B1 mean ns | B1 agrees | B2 mean ns | B2 agrees | bytes/op |
|---|---|---:|---|---:|---|---:|
| DateConverterNepali | 1.0.2 | 419.3 | 61 of 64 | 614.9 | 61 of 64 | 689 / 2,125 |
| NepaliCalendarBS | 1.2.3 | 12,614.0 | 63 of 64 | 192.0 | 63 of 64 | 688 / 32 |
| NepaliDateConverter.NETCORE | 1.0.4 | 22,174.0 | 61 of 64 | 46,434.4 | 60 of 64 | 20,736 / 20,736 |

NepDate is faster than every selected library on both operations. The closest is NepaliCalendarBS on
B2 at 192.0 ns against NepDate's 5.90 ns, 33 times slower. On B1 it is 12,614.0 ns against
5.60 ns. DateConverterNepali is 75 times slower on B1 and 104 times slower on B2.
NepaliDateConverter.NETCORE is the slowest of the three and allocates about 20 KB per call.

None of the selected libraries agrees on all 64 dates:

- DateConverterNepali is one day off at BS 2001-06-07, 2088-01-04 and 2089-06-10 in B1, and at the
  matching AD dates in B2.
- NepaliCalendarBS converts BS 2000-01-01 to AD 1943-04-13 instead of 1943-04-14, in both
  directions.
- NepaliDateConverter.NETCORE is one day off at BS 2088-01-04 and 2089-06-10, and returns
  `0000-00-00` for BS 2090-11-24 and AD 1943-04-14, which are outside its table.

## Note on upstream's comparison

Upstream NepDate's own benchmark, `benchmarks/NepDate.Benchmarks`, times B1 and B2 on one fixed date
each for NepDate and the libraries its README lists. It is useful as a record of upstream's README
figures, but it is not the 64-date measurement this site publishes. On 2026-11-02 it measured
NepDate at 7.58 ns for BS to AD and 18.42 ns for AD to BS on .NET 10, with NepaliCalendarBS,
NepaliDateConverter.NETCORE and NepaliDateConverter.Net as the other libraries. The raw files are
[`raw/2026-11-02-dotnet-upstream-report-github.md`](raw/2026-11-02-dotnet-upstream-report-github.md),
[`raw/2026-11-02-dotnet-upstream-report.csv`](raw/2026-11-02-dotnet-upstream-report.csv) and
[`raw/2026-11-02-dotnet-upstream-machine.txt`](raw/2026-11-02-dotnet-upstream-machine.txt). The
single-date figures are not comparable with the 64-date table above and no port copies them.

## Notes on the numbers

- B7 allocates only on days with events: two `string[]` per call (Nepali and English names). 41 of
  the 64 patro inputs have events, and `2 × (24 + 8n)` bytes summed over them is 3,280 bytes, or
  51.25 bytes per operation, which matches the measured 51 B.
- B5 allocates on every call (seven heap objects, listed in the research note).
- B8 is 29 to 32 calls of B7 plus as many BS to AD constructions per grid; its allocation is the
  same event arrays, summed over the month.
- The benchmark process was pinned to logical CPU 2 and the active power plan was Ultimate
  Performance for the whole run. The load samples show the desktop applications that were open,
  not other benchmark work.
