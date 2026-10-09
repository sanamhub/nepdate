```

BenchmarkDotNet v0.15.8, Windows 11 (10.0.26300.9550)
12th Gen Intel Core i5-12500H 3.10GHz, 1 CPU, 16 logical and 12 physical cores
.NET SDK 10.0.401
  [Host]     : .NET 10.0.12 (10.0.12, 10.0.1226.42308), X64 RyuJIT x86-64-v3
  Job-RXNKYN : .NET 10.0.12 (10.0.12, 10.0.1226.42308), X64 RyuJIT x86-64-v3
  Job-RTDGQM : .NET 8.0.31 (8.0.31, 8.0.3126.42015), X64 RyuJIT x86-64-v3

Affinity=0000000000000100  

```
| Method                            | Runtime   | Mean        | Error     | StdDev     | Median      | Gen0   | Allocated |
|---------------------------------- |---------- |------------:|----------:|-----------:|------------:|-------:|----------:|
| &#39;B1 BS to AD&#39;                     | .NET 10.0 |    13.29 ns |  0.262 ns |   0.383 ns |    13.22 ns |      - |         - |
| &#39;B2 AD to BS&#39;                     | .NET 10.0 |    18.64 ns |  0.222 ns |   0.197 ns |    18.66 ns |      - |         - |
| &#39;B3 add 1000 days&#39;                | .NET 10.0 |    17.50 ns |  0.191 ns |   0.170 ns |    17.49 ns |      - |         - |
| &#39;B4 add 13 months, Clamp&#39;         | .NET 10.0 |    18.85 ns |  0.227 ns |   0.201 ns |    18.89 ns |      - |         - |
| &#39;B5 long format, Nepali, weekday&#39; | .NET 10.0 |   153.02 ns |  4.631 ns |  13.509 ns |   150.77 ns | 0.0458 |     435 B |
| &#39;B6 strict parse&#39;                 | .NET 10.0 |    21.55 ns |  0.393 ns |   0.367 ns |    21.58 ns |      - |         - |
| &#39;B7 patro info&#39;                   | .NET 10.0 |    47.93 ns |  0.900 ns |   0.924 ns |    47.88 ns | 0.0052 |      51 B |
| &#39;B8 patro month grid&#39;             | .NET 10.0 | 3,132.66 ns | 53.874 ns |  71.921 ns | 3,108.12 ns | 0.1373 |    1429 B |
| &#39;B1 BS to AD&#39;                     | .NET 8.0  |    12.57 ns |  0.087 ns |   0.077 ns |    12.57 ns |      - |         - |
| &#39;B2 AD to BS&#39;                     | .NET 8.0  |    22.59 ns |  0.226 ns |   0.189 ns |    22.59 ns |      - |         - |
| &#39;B3 add 1000 days&#39;                | .NET 8.0  |    23.48 ns |  0.370 ns |   0.328 ns |    23.39 ns |      - |         - |
| &#39;B4 add 13 months, Clamp&#39;         | .NET 8.0  |    22.75 ns |  0.453 ns |   0.466 ns |    22.70 ns |      - |         - |
| &#39;B5 long format, Nepali, weekday&#39; | .NET 8.0  |   190.62 ns |  3.768 ns |   8.581 ns |   189.97 ns | 0.0458 |     435 B |
| &#39;B6 strict parse&#39;                 | .NET 8.0  |    27.65 ns |  0.551 ns |   0.589 ns |    27.56 ns |      - |         - |
| &#39;B7 patro info&#39;                   | .NET 8.0  |    56.94 ns |  1.094 ns |   1.124 ns |    56.88 ns | 0.0052 |      51 B |
| &#39;B8 patro month grid&#39;             | .NET 8.0  | 3,567.93 ns | 67.155 ns | 155.641 ns | 3,508.55 ns | 0.1373 |    1429 B |
