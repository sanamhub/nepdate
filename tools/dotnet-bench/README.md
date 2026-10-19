# tools/dotnet-bench: C# NepDate baseline

BenchmarkDotNet project that measures the NepDate NuGet package (2.0.7, the version pinned in
`tools/csharp-golden`) on operations B1 to B8 of [`spec/BENCHMARK.md`](../../spec/BENCHMARK.md).
Results are in [`docs/benchmarks/dotnet.md`](../../docs/benchmarks/dotnet.md).

## Run

From the repo root, on the reference machine, in a Release build and without a debugger:

```
dotnet run -c Release -f net10.0 --project tools/dotnet-bench -- --filter "*" --artifacts <out-dir>
```

The config runs every benchmark twice, once on .NET 10 and once on .NET 8 (both runtimes must be
installed). Each job is pinned to logical CPU 2 (`WithAffinity(0x4)`), as BENCHMARK §1 asks, so no
`start /affinity` wrapper is needed. A full run took 3 min 54 s on the reference machine. BenchmarkDotNet writes
Markdown, CSV and HTML reports to `<out-dir>/results/`; copy the `.md` and `.csv` files to
`docs/benchmarks/raw/`.

To print the 64 inputs and `sizeof(NepaliDate)` without benchmarking:

```
dotnet run -c Release -f net10.0 --project tools/dotnet-bench -- --inputs
```

## Inputs

`Inputs.cs` reads `data/calendar/bs-calendar.json` (embedded at build time) and builds the serial
tables of ALGORITHM §2 and §4 itself, so the inputs don't depend on NepDate:

- B1 to B6: date `i` is serial `s0 + i * ((s1 - s0) / 63)`, with `s0` = serial of BS 2000-01-01
  (36161) and `s1` = serial of BS 2090-12-30. The step is 527 days. B2 uses their AD equivalents
  (epoch 1844-04-11 + serial), B6 uses them formatted as `YYYY/MM/DD`.
- B7 and B8: the same spread over the patro coverage `2077-01-01..=2084-08-20` (PATRO §2).

Before any benchmark runs, the class constructor checks that NepDate gives the same AD date for
all 64 BS inputs, parses all 64 strings back to the same date, and agrees on the patro inputs. Any
difference throws, so a run can't silently measure wrong inputs.

## What each benchmark calls

| ID | NepDate call |
|---|---|
| B1 | `new NepaliDate(y, m, d).EnglishDate` |
| B2 | `new NepaliDate(new DateTime(y, m, d))` |
| B3 | `date.AddDays(1000)` |
| B4 | `date.AddMonths(13)` (default `awayFromMonthEnd: false` is Clamp) |
| B5 | `date.ToLongDateUnicodeString(displayDayName: true)` |
| B6 | `NepaliDate.TryParse(s, out var r)` (the strict parser; `SmartDateParser` is not used) |
| B7 | `date.GetCalendarInfo()` |
| B8 | `new NepaliDate(y, m, d).GetCalendarInfo()` for `d` in `1..=MonthEndDay` |

Each method loops over the 64 inputs and returns a sum built from every result.
`OperationsPerInvoke = 64` makes the reported time and allocation per single operation. For B8 one
operation is a whole month grid (29 to 32 days).
