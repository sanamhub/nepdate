# C# NepDate baseline

Time and allocation of the NepDate NuGet package 2.0.7 on operations B1 to B8 of
[`spec/BENCHMARK.md`](../../spec/BENCHMARK.md), measured with [`tools/dotnet-bench`](../../tools/dotnet-bench/README.md).
Every port copies its "C# NepDate" column from the .NET 10 column below. How NepDate gets these
numbers is in [`docs/research/dotnet-internals.md`](../research/dotnet-internals.md).

The C# comparison the site cites is the upstream comparison below. It times B1 and B2 on one fixed
date each, not on the 64 dates of the B1 to B8 table, so its numbers are kept separate and are not
the ones the ports copy.

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

## Upstream comparison

This is the comparison the site and the landing page cite. It follows the benchmark project in
upstream NepDate, `benchmarks/NepDate.Benchmarks`, and the Performance section of its README, run
here as published at `origin/main` (`c6fff4f`).

### What upstream measures

The suite times two operations for NepDate and for every library its README lists. BS to AD builds
`NepaliDate(2079, 12, 12)` and returns `EnglishDate`. AD to BS builds `NepaliDate` from
`2023-08-28` and returns the three fields. The two inputs are different days, so this is not a
round trip. Each benchmark returns the converted value, so the JIT cannot remove the call.

| Item | Value |
|---|---|
| Operations | B1 BS to AD, B2 AD to BS |
| B1 input | BS 2079-12-12 |
| B2 input | AD 2023-08-28 |
| Libraries | NepDate 2.0.7, NepaliCalendarBS 1.2.3, NepaliDateConverter.NETCORE 1.0.4, NepaliDateConverter.Net from the DLL upstream commits (assembly 1.0.0.0) |
| Job | BenchmarkDotNet `DefaultJob`, no `OperationsPerInvoke`, `[MemoryDiagnoser]`, `[RankColumn]`, grouped by category |
| Runtime | .NET 10.0.14 (10.0.1426.52326), X64 RyuJIT x86-64-v3; target `net10.0` |
| BenchmarkDotNet | 0.15.8 |
| Optimizations check | off, because NepaliCalendarBS ships a Debug build |

| Item | Value |
|---|---|
| CPU | 12th Gen Intel Core i5-12500H (4 performance + 8 efficiency cores, 16 threads, base 3.1 GHz) |
| RAM | 31.7 GB |
| OS | Windows 11 Home 10.0.26300 (build 10.0.26300.9818) |
| Power plan | Ultimate Performance, on AC |
| Affinity | logical CPU 2 (mask `0x4`), set by the `start /affinity 4` wrapper and inherited by every benchmark process |
| CPU load | 4, 0 and 1 percent before the run (1.7 average); 3, 5 and 1 percent after (3.0 average) |
| Date of run | 2026-11-02 |

Command, from `benchmarks/NepDate.Benchmarks`:

```
cmd /c "start /affinity 4 /high /wait /b dotnet run -c Release -f net10.0"
```

### Results

Mean and error are BenchmarkDotNet's, per single call. Ratio is the BenchmarkDotNet ratio against
NepDate in the same run. Allocated is managed memory per call; `0 B` is the `-` column in the raw
report.

| Operation | Library | Version | Mean ns | Error ns | Ratio | Allocated |
|---|---|---:|---:|---:|---:|---:|
| BS to AD | **NepDate** | 2.0.7 | **7.58** | 0.06 | 1.00 | **0 B** |
| BS to AD | NepaliCalendarBS | 1.2.3 | 17,705.16 | 232.36 | 2,335.98 | 688 B |
| BS to AD | NepaliDateConverter.NETCORE | 1.0.4 | 33,529.46 | 538.11 | 4,423.79 | 20,688 B |
| BS to AD | NepaliDateConverter.Net | 1.0.0.0 | 41,861.36 | 372.70 | 5,523.09 | 19,968 B |
| AD to BS | **NepDate** | 2.0.7 | **18.42** | 0.33 | 1.00 | **0 B** |
| AD to BS | NepaliCalendarBS | 1.2.3 | 203.94 | 3.68 | 11.07 | 32 B |
| AD to BS | NepaliDateConverter.Net | 1.0.0.0 | 83,759.31 | 898.01 | 4,547.43 | 19,968 B |
| AD to BS | NepaliDateConverter.NETCORE | 1.0.4 | 88,677.60 | 1,711.39 | 4,814.45 | 20,688 B |

NepDate is fastest on both operations and allocates nothing on either. NepaliCalendarBS is the
closest library on both, 2,336 times slower on BS to AD and 11 times slower on AD to BS. The
largest ratio in this run is 5,523 times (NepaliDateConverter.Net on BS to AD). The upstream
README reports 4.55 ns, 13.60 ns and up to 8,600 times faster on .NET 10.0.5. This run, on .NET
10.0.14 and an otherwise idle machine, measured 7.58 and 18.42 ns and 5,523 times. The ordering
and the zero allocation are the same; the exact nanoseconds and the 8,600 figure are not.

Upstream's benchmark does not check correctness. The hub's `--agrees` check on its 64 dates says
NepaliCalendarBS agrees on 63, NepaliDateConverter.Net on 61 for BS to AD and 60 for AD to BS, and
NepaliDateConverter.NETCORE on 61 and 60. NepDate agrees on all 64. Every library in this set
therefore gets some dates wrong, so none is ranked first.

The raw reports are
[`raw/2026-11-02-dotnet-upstream-report-github.md`](raw/2026-11-02-dotnet-upstream-report-github.md)
and [`raw/2026-11-02-dotnet-upstream-report.csv`](raw/2026-11-02-dotnet-upstream-report.csv). The
machine and load record is
[`raw/2026-11-02-dotnet-upstream-machine.txt`](raw/2026-11-02-dotnet-upstream-machine.txt).

## Survey of other packages

This is a wider survey of the C# BS converters on nuget.org, kept for its correctness findings. It
is not the comparison the site cites, and its numbers are not used in the site data. It measures
B1 (BS to AD) and B2 (AD to BS) with `CompetitorBenchmarks` in
[`tools/dotnet-bench`](../../tools/dotnet-bench/README.md) on the same 64 inputs, job settings and
`OperationsPerInvoke = 64` as the NepDate table above. Only B1 and B2 are measured for them. The
README there lists the exact call used for each library.

| Item | Value |
|---|---|
| Machine | the same machine, power plan and affinity as above |
| OS | Windows 11 Home 10.0.26300 (build 10.0.26300.9818) |
| .NET SDK | 10.0.403 |
| Runtimes | .NET 10.0.14 (10.0.1426.52326) and .NET 8.0.33 (8.0.3326.52219), X64 RyuJIT x86-64-v3 |
| BenchmarkDotNet | 0.15.8, default job, `[MemoryDiagnoser]` |
| Date of run | 2026-10-30; machine load was not recorded |

Command, from the repo root:

```
dotnet run -c Release -f net10.0 --project tools/dotnet-bench -- --filter "*CompetitorBenchmarks*" "DotnetBench.Benchmarks.B1_BsToAd" "DotnetBench.Benchmarks.B2_AdToBs" --artifacts <out-dir>
```

The raw reports are [`raw/2026-10-30-dotnet-competitors-report-github.md`](raw/2026-10-30-dotnet-competitors-report-github.md)
and [`raw/2026-10-30-dotnet-competitors-report.csv`](raw/2026-10-30-dotnet-competitors-report.csv),
with the same-session NepDate B1 and B2 in [`raw/2026-10-30-dotnet-nepdate-b1-b2-report-github.md`](raw/2026-10-30-dotnet-nepdate-b1-b2-report-github.md)
and [`raw/2026-10-30-dotnet-nepdate-b1-b2-report.csv`](raw/2026-10-30-dotnet-nepdate-b1-b2-report.csv).

### Results (.NET 10)

Time is the .NET 10 mean per single conversion; the .NET 8 numbers are in the raw report. "Agrees"
is how many of the 64 results match the hub calendar data (and NepDate), from
`dotnet run -c Release -f net10.0 --project tools/dotnet-bench -- --agrees`. Bytes/op is B1 / B2.

| Library | Version | B1 mean ns | B1 agrees | B2 mean ns | B2 agrees | bytes/op |
|---|---|---:|---|---:|---|---:|
| OSN.NepaliCalendar | 1.0.0 | 12.90 | 61 of 64 | 24.66 | 61 of 64 | 0 / 0 |
| BsadConverter | 1.1.0 | 129.84 | 62 of 64 | 639.36 | 62 of 64 | 120 / 960 |
| NepaliUtility.Core | 1.0.2 | 354.81 | 61 of 64 | 2,268.19 | 61 of 64 | 32 / 32 |
| BSDateConverter | 1.3.0 | 599.51 | 61 of 64 | 5,829.35 | 61 of 64 | 464 / 296 |
| NepaliCalendarBS | 1.2.3 | 14,612.94 | 63 of 64 | 199.73 | 63 of 64 | 688 / 32 |
| NepaliDateConverter.NETCORE | 1.0.4 | 24,224.09 | 61 of 64 | 52,243.22 | 60 of 64 | 20,736 / 20,736 |
| NepaliDateConverter.Net | 2.0.1 | 31,448.70 | 61 of 64 | 51,057.99 | 60 of 64 | 20,016 / 20,016 |
| NepaliCalendarToolkit | 2.0.2 | not timed | 13 of 64 | not timed | 13 of 64 | |

NepDate 2.0.7 agrees on 64 of 64 for both. In this session it measured 15.10 ns for B1 and 21.60 ns
for B2 on .NET 10, slower than the 13.29 and 18.64 ns of the table above. The survey uses the
same-session numbers.

In the survey, the fastest other library is OSN.NepaliCalendar on both operations. Against NepDate
in the same session it is 0.85 times NepDate's time on B1 (12.90 against 15.10 ns) and 1.14 times
on B2 (24.66 against 21.60 ns), with no allocation. It disagrees on 3 of the 64 dates, so by
BENCHMARK §4 it is listed but not ranked first. No other library agrees on all 64 inputs either.

### Where they differ

- OSN.NepaliCalendar, NepaliUtility.Core and BSDateConverter give the same wrong answers: BS
  2086/07/23, 2088/01/04 and 2089/06/10 are off by one or two days, in B1 and in B2. Their month
  tables differ from the hub data in those years.
- BsadConverter is off by one day on BS 2088/01/04 and 2089/06/10.
- NepaliCalendarBS is off by one day on BS 2000/01/01, the first input: it converts it to AD
  1943-04-13 instead of 1943-04-14.
- NepaliDateConverter.Net and NepaliDateConverter.NETCORE ship the same converter. They are off by
  one day on BS 2088/01/04 and 2089/06/10, and return the empty date 0000-00-00 instead of throwing
  for BS 2090/11/24 and AD 1943-04-14, which are outside their table. Both allocate about 20 KB per
  conversion.
- NepaliCalendarToolkit throws `ArgumentOutOfRangeException` on 51 inputs, every input before BS
  2073/07/28 in this set, and agrees on the 13 it accepts. It isn't timed, since a timing would
  mostly measure exceptions.

### Notes on the libraries

- Versions are the latest on nuget.org on the date of run, each published at least two weeks
  earlier, and all are MIT licensed (NepaliDateConverter.NETCORE is MIT or Apache-2.0).
- NepaliCalendarBS, NepaliDateConverter.Net and NepaliDateConverter.NETCORE are also the libraries
  in the upstream comparison above and the ones the NepDate README names. The survey's
  NepaliDateConverter.Net is the 2.0.1 package; the upstream run uses the DLL committed in the
  upstream repository, whose assembly is 1.0.0.0. The other five are the BS to AD converters on
  nuget.org with a release in the twelve months before the run. Left out: DateConverterNepali (last
  release 2024-07), NepaliCalendar (no license in the package), and MeroMiti (first release less
  than two weeks before the run).
- NepaliCalendarBS ships a Debug build, so the run turns off BenchmarkDotNet's optimizations check;
  it is measured as published. Its B1 takes a `YYYY/MM/DD` string and is about 70 times slower
  than its own B2.
- NepaliDateConverter.Net ships only a .NET Framework 4.5 assembly; it loads and runs on .NET 8
  and 10.
- BSDateConverter and BsadConverter return text for B1 (and BSDateConverter for B2 as well); the
  benchmark consumes the string's length and doesn't parse it back.
