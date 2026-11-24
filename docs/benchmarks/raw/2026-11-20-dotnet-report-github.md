```

BenchmarkDotNet v0.15.8, Windows 11 (10.0.26300.9974)
12th Gen Intel Core i5-12500H 3.10GHz, 1 CPU, 16 logical and 12 physical cores
.NET SDK 11.0.100
  [Host]     : .NET 10.0.15 (10.0.15, 10.0.1526.53008), X64 RyuJIT x86-64-v3
  Job-WMWMCP : .NET 10.0.15 (10.0.15, 10.0.1526.53008), X64 RyuJIT x86-64-v3
  Job-FIFZYN : .NET 8.0.34 (8.0.34, 8.0.3426.52217), X64 RyuJIT x86-64-v3

Affinity=0000000000000100  PowerPlanMode=5a4d4a58-bc7d-4df9-9eb7-5f61415ae0f6  

```
| Method                            | Runtime   | Mean       | Error      | StdDev     | Gen0   | Allocated |
|---------------------------------- |---------- |-----------:|-----------:|-----------:|-------:|----------:|
| &#39;B1 BS to AD&#39;                     | .NET 10.0 |   5.599 ns |  0.0976 ns |  0.0815 ns |      - |         - |
| &#39;B2 AD to BS&#39;                     | .NET 10.0 |   5.898 ns |  0.1131 ns |  0.1303 ns |      - |         - |
| &#39;B3 add 1000 days&#39;                | .NET 10.0 |   2.793 ns |  0.0533 ns |  0.1288 ns |      - |         - |
| &#39;B4 add 13 months, Clamp&#39;         | .NET 10.0 |   2.454 ns |  0.0409 ns |  0.0363 ns |      - |         - |
| &#39;B5 long format, Nepali, weekday&#39; | .NET 10.0 |  29.960 ns |  0.3945 ns |  0.3690 ns | 0.0072 |      69 B |
| &#39;B6 strict parse&#39;                 | .NET 10.0 |   7.282 ns |  0.0602 ns |  0.0503 ns |      - |         - |
| &#39;B7 patro info&#39;                   | .NET 10.0 |  16.463 ns |  0.3252 ns |  0.5522 ns | 0.0054 |      51 B |
| &#39;B8 patro month grid&#39;             | .NET 10.0 | 633.131 ns | 12.6427 ns | 18.9230 ns | 0.1488 |    1429 B |
| &#39;B1 BS to AD&#39;                     | .NET 8.0  |   5.983 ns |  0.1194 ns |  0.1750 ns |      - |         - |
| &#39;B2 AD to BS&#39;                     | .NET 8.0  |   6.084 ns |  0.1064 ns |  0.0888 ns |      - |         - |
| &#39;B3 add 1000 days&#39;                | .NET 8.0  |   2.817 ns |  0.0158 ns |  0.0132 ns |      - |         - |
| &#39;B4 add 13 months, Clamp&#39;         | .NET 8.0  |   2.894 ns |  0.0263 ns |  0.0220 ns |      - |         - |
| &#39;B5 long format, Nepali, weekday&#39; | .NET 8.0  |  32.621 ns |  0.6419 ns |  1.7463 ns | 0.0072 |      69 B |
| &#39;B6 strict parse&#39;                 | .NET 8.0  |   7.270 ns |  0.1453 ns |  0.2901 ns |      - |         - |
| &#39;B7 patro info&#39;                   | .NET 8.0  |  22.972 ns |  0.4581 ns |  0.9762 ns | 0.0054 |      51 B |
| &#39;B8 patro month grid&#39;             | .NET 8.0  | 836.609 ns | 10.4246 ns |  8.7050 ns | 0.1488 |    1429 B |
