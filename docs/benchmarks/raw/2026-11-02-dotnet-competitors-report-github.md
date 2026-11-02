```

BenchmarkDotNet v0.15.8, Windows 11 (10.0.26300.9818)
12th Gen Intel Core i5-12500H 3.10GHz, 1 CPU, 16 logical and 12 physical cores
.NET SDK 10.0.403
  [Host]     : .NET 10.0.14 (10.0.14, 10.0.1426.52326), X64 RyuJIT x86-64-v3
  Job-WMWMCP : .NET 10.0.14 (10.0.14, 10.0.1426.52326), X64 RyuJIT x86-64-v3
  Job-FIFZYN : .NET 8.0.33 (8.0.33, 8.0.3326.52219), X64 RyuJIT x86-64-v3

Affinity=0000000000000100  PowerPlanMode=5a4d4a58-bc7d-4df9-9eb7-5f61415ae0f6  

```
| Method                                     | Runtime   | Mean        | Error       | StdDev      | Median      | Gen0   | Gen1   | Allocated |
|------------------------------------------- |---------- |------------:|------------:|------------:|------------:|-------:|-------:|----------:|
| &#39;B1 BS to AD, DateConverterNepali&#39;         | .NET 10.0 |    406.0 ns |     7.95 ns |    13.07 ns |    401.8 ns | 0.0725 |      - |     689 B |
| &#39;B2 AD to BS, DateConverterNepali&#39;         | .NET 10.0 |    590.1 ns |    11.53 ns |    14.16 ns |    586.1 ns | 0.2251 |      - |    2125 B |
| &#39;B1 BS to AD, NepaliCalendarBS&#39;            | .NET 10.0 | 13,047.6 ns |    69.36 ns |    57.92 ns | 13,042.4 ns | 0.0610 |      - |     688 B |
| &#39;B2 AD to BS, NepaliCalendarBS&#39;            | .NET 10.0 |    185.0 ns |     0.96 ns |     0.75 ns |    185.0 ns | 0.0033 |      - |      32 B |
| &#39;B1 BS to AD, NepaliDateConverter.NETCORE&#39; | .NET 10.0 | 21,730.5 ns |   324.85 ns |   271.26 ns | 21,759.1 ns | 2.1973 | 0.0610 |   20736 B |
| &#39;B2 AD to BS, NepaliDateConverter.NETCORE&#39; | .NET 10.0 | 46,302.6 ns |   301.64 ns |   251.88 ns | 46,323.9 ns | 2.1973 |      - |   20736 B |
| &#39;B1 BS to AD, DateConverterNepali&#39;         | .NET 8.0  |    462.5 ns |     9.23 ns |    20.44 ns |    454.8 ns | 0.0896 |      - |     849 B |
| &#39;B2 AD to BS, DateConverterNepali&#39;         | .NET 8.0  |    649.1 ns |    12.82 ns |    21.77 ns |    642.2 ns | 0.2346 |      - |    2221 B |
| &#39;B1 BS to AD, NepaliCalendarBS&#39;            | .NET 8.0  | 13,182.8 ns |   166.84 ns |   156.07 ns | 13,136.0 ns | 0.0610 |      - |     688 B |
| &#39;B2 AD to BS, NepaliCalendarBS&#39;            | .NET 8.0  |    184.1 ns |     1.90 ns |     1.58 ns |    184.1 ns | 0.0033 |      - |      32 B |
| &#39;B1 BS to AD, NepaliDateConverter.NETCORE&#39; | .NET 8.0  | 24,923.9 ns |   484.61 ns |   475.95 ns | 24,813.8 ns | 2.1973 | 0.1221 |   20896 B |
| &#39;B2 AD to BS, NepaliDateConverter.NETCORE&#39; | .NET 8.0  | 70,784.4 ns | 1,306.67 ns | 1,158.33 ns | 70,310.0 ns | 2.1973 | 0.1221 |   20876 B |
