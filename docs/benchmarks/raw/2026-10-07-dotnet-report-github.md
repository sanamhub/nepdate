```

BenchmarkDotNet v0.15.8, Windows 11 (10.0.26300.9550)
12th Gen Intel Core i5-12500H 3.10GHz, 1 CPU, 16 logical and 12 physical cores
.NET SDK 10.0.401
  [Host]     : .NET 10.0.12 (10.0.12, 10.0.1226.42308), X64 RyuJIT x86-64-v3
  Job-RXNKYN : .NET 10.0.12 (10.0.12, 10.0.1226.42308), X64 RyuJIT x86-64-v3
  Job-RTDGQM : .NET 8.0.31 (8.0.31, 8.0.3126.42015), X64 RyuJIT x86-64-v3

Affinity=0000000000000100  

```
| Method                            | Runtime   | Mean        | Error      | StdDev     | Median      | Gen0   | Allocated |
|---------------------------------- |---------- |------------:|-----------:|-----------:|------------:|-------:|----------:|
| &#39;B1 BS to AD&#39;                     | .NET 10.0 |    13.48 ns |   0.224 ns |   0.329 ns |    13.39 ns |      - |         - |
| &#39;B2 AD to BS&#39;                     | .NET 10.0 |    19.54 ns |   0.355 ns |   0.773 ns |    19.31 ns |      - |         - |
| &#39;B3 add 1000 days&#39;                | .NET 10.0 |    19.84 ns |   0.480 ns |   1.347 ns |    19.38 ns |      - |         - |
| &#39;B4 add 13 months, Clamp&#39;         | .NET 10.0 |    21.71 ns |   0.711 ns |   2.039 ns |    21.14 ns |      - |         - |
| &#39;B5 long format, Nepali, weekday&#39; | .NET 10.0 |   208.35 ns |  14.395 ns |  42.218 ns |   203.54 ns | 0.0458 |     435 B |
| &#39;B6 strict parse&#39;                 | .NET 10.0 |    25.67 ns |   0.514 ns |   0.800 ns |    25.44 ns |      - |         - |
| &#39;B7 patro info&#39;                   | .NET 10.0 |    47.49 ns |   0.692 ns |   0.577 ns |    47.56 ns | 0.0052 |      51 B |
| &#39;B8 patro month grid&#39;             | .NET 10.0 | 3,256.05 ns |  50.970 ns |  56.653 ns | 3,249.74 ns | 0.1373 |    1429 B |
| &#39;B1 BS to AD&#39;                     | .NET 8.0  |    12.72 ns |   0.251 ns |   0.427 ns |    12.66 ns |      - |         - |
| &#39;B2 AD to BS&#39;                     | .NET 8.0  |    22.07 ns |   0.181 ns |   0.151 ns |    22.06 ns |      - |         - |
| &#39;B3 add 1000 days&#39;                | .NET 8.0  |    24.45 ns |   0.454 ns |   0.402 ns |    24.39 ns |      - |         - |
| &#39;B4 add 13 months, Clamp&#39;         | .NET 8.0  |    21.58 ns |   0.472 ns |   1.354 ns |    21.11 ns |      - |         - |
| &#39;B5 long format, Nepali, weekday&#39; | .NET 8.0  |   203.27 ns |   4.806 ns |  13.866 ns |   200.66 ns | 0.0458 |     435 B |
| &#39;B6 strict parse&#39;                 | .NET 8.0  |    28.81 ns |   0.568 ns |   1.121 ns |    28.49 ns |      - |         - |
| &#39;B7 patro info&#39;                   | .NET 8.0  |    55.30 ns |   1.352 ns |   3.901 ns |    54.02 ns | 0.0052 |      51 B |
| &#39;B8 patro month grid&#39;             | .NET 8.0  | 3,823.23 ns | 184.369 ns | 523.024 ns | 3,561.45 ns | 0.1373 |    1429 B |
