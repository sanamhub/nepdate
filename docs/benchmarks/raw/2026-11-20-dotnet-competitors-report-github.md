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
| &#39;B1 BS to AD, DateConverterNepali&#39;         | .NET 10.0 |    419.3 ns |   7.94 ns |    17.60 ns |    417.8 ns | 0.0725 |      - |     689 B |
| &#39;B2 AD to BS, DateConverterNepali&#39;         | .NET 10.0 |    614.9 ns |  12.25 ns |    32.50 ns |    609.6 ns | 0.2251 |      - |    2125 B |
| &#39;B1 BS to AD, NepaliCalendarBS&#39;            | .NET 10.0 | 12,614.0 ns | 181.17 ns |   169.47 ns | 12,535.3 ns | 0.0610 |      - |     688 B |
| &#39;B2 AD to BS, NepaliCalendarBS&#39;            | .NET 10.0 |    192.0 ns |   4.06 ns |    11.59 ns |    188.1 ns | 0.0033 |      - |      32 B |
| &#39;B1 BS to AD, NepaliDateConverter.NETCORE&#39; | .NET 10.0 | 22,174.0 ns | 357.89 ns |   317.26 ns | 22,101.2 ns | 2.1973 | 0.0610 |   20736 B |
| &#39;B2 AD to BS, NepaliDateConverter.NETCORE&#39; | .NET 10.0 | 46,434.4 ns | 657.38 ns | 1,003.89 ns | 46,165.1 ns | 2.1973 |      - |   20736 B |
| &#39;B1 BS to AD, DateConverterNepali&#39;         | .NET 8.0  |    438.7 ns |   7.43 ns |     7.95 ns |    435.7 ns | 0.0896 |      - |     849 B |
| &#39;B2 AD to BS, DateConverterNepali&#39;         | .NET 8.0  |    633.2 ns |  12.45 ns |    12.79 ns |    632.2 ns | 0.2346 |      - |    2221 B |
| &#39;B1 BS to AD, NepaliCalendarBS&#39;            | .NET 8.0  | 12,676.2 ns |  85.08 ns |    79.58 ns | 12,698.2 ns | 0.0610 |      - |     688 B |
| &#39;B2 AD to BS, NepaliCalendarBS&#39;            | .NET 8.0  |    174.6 ns |   1.01 ns |     0.84 ns |    174.5 ns | 0.0033 |      - |      32 B |
| &#39;B1 BS to AD, NepaliDateConverter.NETCORE&#39; | .NET 8.0  | 24,591.9 ns | 241.33 ns |   213.94 ns | 24,626.9 ns | 2.1973 | 0.1221 |   20896 B |
| &#39;B2 AD to BS, NepaliDateConverter.NETCORE&#39; | .NET 8.0  | 69,290.9 ns | 458.88 ns |   358.26 ns | 69,352.0 ns | 2.1973 | 0.1221 |   20876 B |
