```

BenchmarkDotNet v0.15.8, Windows 11 (10.0.26300.9974)
12th Gen Intel Core i5-12500H 3.10GHz, 1 CPU, 16 logical and 12 physical cores
.NET SDK 11.0.100
  [Host]     : .NET 10.0.15 (10.0.15, 10.0.1526.53008), X64 RyuJIT x86-64-v3
  Job-WMWMCP : .NET 10.0.15 (10.0.15, 10.0.1526.53008), X64 RyuJIT x86-64-v3
  Job-FIFZYN : .NET 8.0.34 (8.0.34, 8.0.3426.52217), X64 RyuJIT x86-64-v3

Affinity=0000000000000100  PowerPlanMode=5a4d4a58-bc7d-4df9-9eb7-5f61415ae0f6  

```
| Method                                     | Runtime   | Mean        | Error     | StdDev      | Median      | Gen0   | Gen1   | Allocated |
|------------------------------------------- |---------- |------------:|----------:|------------:|------------:|-------:|-------:|----------:|
| &#39;B1 BS to AD, DateConverterNepali&#39;         | .NET 10.0 |    393.6 ns |   7.37 ns |    13.84 ns |    387.7 ns | 0.0725 |      - |     689 B |
| &#39;B2 AD to BS, DateConverterNepali&#39;         | .NET 10.0 |    561.4 ns |  10.72 ns |    13.17 ns |    555.7 ns | 0.2251 |      - |    2125 B |
| &#39;B1 BS to AD, NepaliCalendarBS&#39;            | .NET 10.0 | 12,991.9 ns | 152.14 ns |   142.31 ns | 12,926.4 ns | 0.0610 |      - |     688 B |
| &#39;B2 AD to BS, NepaliCalendarBS&#39;            | .NET 10.0 |    182.2 ns |   2.42 ns |     2.02 ns |    181.6 ns | 0.0033 |      - |      32 B |
| &#39;B1 BS to AD, NepaliDateConverter.NETCORE&#39; | .NET 10.0 | 21,924.7 ns | 426.04 ns |   568.76 ns | 21,669.6 ns | 2.1973 | 0.0610 |   20736 B |
| &#39;B2 AD to BS, NepaliDateConverter.NETCORE&#39; | .NET 10.0 | 45,688.7 ns | 743.77 ns | 1,113.24 ns | 45,270.5 ns | 2.1973 |      - |   20736 B |
| &#39;B1 BS to AD, DateConverterNepali&#39;         | .NET 8.0  |    419.6 ns |   7.36 ns |    11.68 ns |    414.4 ns | 0.0896 |      - |     849 B |
| &#39;B2 AD to BS, DateConverterNepali&#39;         | .NET 8.0  |    606.6 ns |   7.34 ns |     6.13 ns |    607.4 ns | 0.2346 |      - |    2221 B |
| &#39;B1 BS to AD, NepaliCalendarBS&#39;            | .NET 8.0  | 12,479.4 ns |  73.70 ns |    65.34 ns | 12,487.2 ns | 0.0610 |      - |     688 B |
| &#39;B2 AD to BS, NepaliCalendarBS&#39;            | .NET 8.0  |    175.5 ns |   0.69 ns |     0.58 ns |    175.8 ns | 0.0033 |      - |      32 B |
| &#39;B1 BS to AD, NepaliDateConverter.NETCORE&#39; | .NET 8.0  | 27,526.8 ns | 186.67 ns |   155.88 ns | 27,585.0 ns | 2.1973 | 0.1221 |   20896 B |
| &#39;B2 AD to BS, NepaliDateConverter.NETCORE&#39; | .NET 8.0  | 67,461.2 ns | 403.12 ns |   357.35 ns | 67,497.9 ns | 2.1973 | 0.1221 |   20876 B |
