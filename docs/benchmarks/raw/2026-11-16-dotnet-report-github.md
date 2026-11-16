```

BenchmarkDotNet v0.15.8, Windows 11 (10.0.26300.9974)
12th Gen Intel Core i5-12500H 3.10GHz, 1 CPU, 16 logical and 12 physical cores
.NET SDK 11.0.100
  [Host]     : .NET 10.0.15 (10.0.15, 10.0.1526.53008), X64 RyuJIT x86-64-v3
  Job-WMWMCP : .NET 10.0.15 (10.0.15, 10.0.1526.53008), X64 RyuJIT x86-64-v3
  Job-FIFZYN : .NET 8.0.34 (8.0.34, 8.0.3426.52217), X64 RyuJIT x86-64-v3

Affinity=0000000000000100  PowerPlanMode=5a4d4a58-bc7d-4df9-9eb7-5f61415ae0f6  

```
| Method                            | Runtime   | Mean        | Error     | StdDev    | Gen0   | Allocated |
|---------------------------------- |---------- |------------:|----------:|----------:|-------:|----------:|
| &#39;B1 BS to AD&#39;                     | .NET 10.0 |    13.27 ns |  0.264 ns |  0.352 ns |      - |         - |
| &#39;B2 AD to BS&#39;                     | .NET 10.0 |    18.70 ns |  0.101 ns |  0.085 ns |      - |         - |
| &#39;B3 add 1000 days&#39;                | .NET 10.0 |    20.06 ns |  0.149 ns |  0.140 ns |      - |         - |
| &#39;B4 add 13 months, Clamp&#39;         | .NET 10.0 |    19.30 ns |  0.123 ns |  0.103 ns |      - |         - |
| &#39;B5 long format, Nepali, weekday&#39; | .NET 10.0 |   139.04 ns |  2.727 ns |  4.325 ns | 0.0458 |     435 B |
| &#39;B6 strict parse&#39;                 | .NET 10.0 |    21.13 ns |  0.103 ns |  0.096 ns |      - |         - |
| &#39;B7 patro info&#39;                   | .NET 10.0 |    48.63 ns |  0.258 ns |  0.215 ns | 0.0052 |      51 B |
| &#39;B8 patro month grid&#39;             | .NET 10.0 | 3,274.50 ns | 33.236 ns | 25.949 ns | 0.1373 |    1429 B |
| &#39;B1 BS to AD&#39;                     | .NET 8.0  |    12.56 ns |  0.079 ns |  0.066 ns |      - |         - |
| &#39;B2 AD to BS&#39;                     | .NET 8.0  |    23.08 ns |  0.237 ns |  0.185 ns |      - |         - |
| &#39;B3 add 1000 days&#39;                | .NET 8.0  |    25.84 ns |  0.199 ns |  0.166 ns |      - |         - |
| &#39;B4 add 13 months, Clamp&#39;         | .NET 8.0  |    21.51 ns |  0.261 ns |  0.218 ns |      - |         - |
| &#39;B5 long format, Nepali, weekday&#39; | .NET 8.0  |   205.13 ns |  6.049 ns | 16.961 ns | 0.0458 |     435 B |
| &#39;B6 strict parse&#39;                 | .NET 8.0  |    30.81 ns |  0.447 ns |  0.396 ns |      - |         - |
| &#39;B7 patro info&#39;                   | .NET 8.0  |    52.62 ns |  0.964 ns |  0.854 ns | 0.0052 |      51 B |
| &#39;B8 patro month grid&#39;             | .NET 8.0  | 3,333.02 ns | 27.549 ns | 23.005 ns | 0.1373 |    1429 B |
