```

BenchmarkDotNet v0.15.8, Windows 11 (10.0.26300.9818)
12th Gen Intel Core i5-12500H 3.10GHz, 1 CPU, 16 logical and 12 physical cores
.NET SDK 10.0.403
  [Host]     : .NET 10.0.14 (10.0.14, 10.0.1426.52326), X64 RyuJIT x86-64-v3
  Job-WMWMCP : .NET 10.0.14 (10.0.14, 10.0.1426.52326), X64 RyuJIT x86-64-v3
  Job-FIFZYN : .NET 8.0.33 (8.0.33, 8.0.3326.52219), X64 RyuJIT x86-64-v3

Affinity=0000000000000100  PowerPlanMode=5a4d4a58-bc7d-4df9-9eb7-5f61415ae0f6  

```
| Method                            | Runtime   | Mean        | Error     | StdDev     | Median      | Gen0   | Allocated |
|---------------------------------- |---------- |------------:|----------:|-----------:|------------:|-------:|----------:|
| &#39;B1 BS to AD&#39;                     | .NET 10.0 |    13.50 ns |  0.122 ns |   0.114 ns |    13.48 ns |      - |         - |
| &#39;B2 AD to BS&#39;                     | .NET 10.0 |    20.10 ns |  0.376 ns |   0.462 ns |    20.07 ns |      - |         - |
| &#39;B3 add 1000 days&#39;                | .NET 10.0 |    19.05 ns |  0.211 ns |   0.187 ns |    19.03 ns |      - |         - |
| &#39;B4 add 13 months, Clamp&#39;         | .NET 10.0 |    20.19 ns |  0.086 ns |   0.076 ns |    20.18 ns |      - |         - |
| &#39;B5 long format, Nepali, weekday&#39; | .NET 10.0 |   150.41 ns |  2.969 ns |   7.055 ns |   150.00 ns | 0.0458 |     435 B |
| &#39;B6 strict parse&#39;                 | .NET 10.0 |    22.42 ns |  0.200 ns |   0.187 ns |    22.39 ns |      - |         - |
| &#39;B7 patro info&#39;                   | .NET 10.0 |    48.21 ns |  0.368 ns |   0.307 ns |    48.14 ns | 0.0052 |      51 B |
| &#39;B8 patro month grid&#39;             | .NET 10.0 | 3,112.76 ns | 61.068 ns |  65.342 ns | 3,091.26 ns | 0.1373 |    1429 B |
| &#39;B1 BS to AD&#39;                     | .NET 8.0  |    13.02 ns |  0.215 ns |   0.190 ns |    12.95 ns |      - |         - |
| &#39;B2 AD to BS&#39;                     | .NET 8.0  |    24.24 ns |  0.445 ns |   0.372 ns |    24.18 ns |      - |         - |
| &#39;B3 add 1000 days&#39;                | .NET 8.0  |    26.78 ns |  0.343 ns |   0.267 ns |    26.71 ns |      - |         - |
| &#39;B4 add 13 months, Clamp&#39;         | .NET 8.0  |    22.09 ns |  0.249 ns |   0.208 ns |    22.12 ns |      - |         - |
| &#39;B5 long format, Nepali, weekday&#39; | .NET 8.0  |   201.70 ns |  3.946 ns |   4.990 ns |   201.42 ns | 0.0458 |     435 B |
| &#39;B6 strict parse&#39;                 | .NET 8.0  |    31.27 ns |  0.298 ns |   0.249 ns |    31.28 ns |      - |         - |
| &#39;B7 patro info&#39;                   | .NET 8.0  |    60.50 ns |  1.176 ns |   1.043 ns |    60.14 ns | 0.0052 |      51 B |
| &#39;B8 patro month grid&#39;             | .NET 8.0  | 3,741.58 ns | 73.278 ns | 133.993 ns | 3,681.35 ns | 0.1373 |    1429 B |
