```

BenchmarkDotNet v0.15.8, Windows 11 (10.0.26300.9818)
12th Gen Intel Core i5-12500H 3.10GHz, 1 CPU, 16 logical and 12 physical cores
.NET SDK 10.0.403
  [Host]     : .NET 10.0.14 (10.0.14, 10.0.1426.52326), X64 RyuJIT x86-64-v3
  Job-RXNKYN : .NET 10.0.14 (10.0.14, 10.0.1426.52326), X64 RyuJIT x86-64-v3
  Job-RTDGQM : .NET 8.0.33 (8.0.33, 8.0.3326.52219), X64 RyuJIT x86-64-v3

Affinity=0000000000000100  

```
| Method                                     | Runtime   | Mean         | Error        | StdDev       | Median       | Gen0   | Gen1   | Allocated |
|------------------------------------------- |---------- |-------------:|-------------:|-------------:|-------------:|-------:|-------:|----------:|
| &#39;B1 BS to AD, NepaliCalendarBS&#39;            | .NET 10.0 | 14,612.94 ns |   281.962 ns |   276.925 ns | 14,559.88 ns | 0.0610 |      - |     688 B |
| &#39;B2 AD to BS, NepaliCalendarBS&#39;            | .NET 10.0 |    199.73 ns |     3.794 ns |     4.798 ns |    198.88 ns | 0.0033 |      - |      32 B |
| &#39;B1 BS to AD, NepaliDateConverter.Net&#39;     | .NET 10.0 | 31,448.70 ns | 1,841.100 ns | 5,370.576 ns | 30,471.02 ns | 2.0752 | 0.0610 |   20016 B |
| &#39;B2 AD to BS, NepaliDateConverter.Net&#39;     | .NET 10.0 | 51,057.99 ns | 1,004.087 ns | 1,677.603 ns | 50,797.36 ns | 2.0752 |      - |   20016 B |
| &#39;B1 BS to AD, NepaliDateConverter.NETCORE&#39; | .NET 10.0 | 24,224.09 ns |   454.977 ns |   523.952 ns | 24,353.96 ns | 2.1973 | 0.0610 |   20736 B |
| &#39;B2 AD to BS, NepaliDateConverter.NETCORE&#39; | .NET 10.0 | 52,243.22 ns | 1,015.654 ns | 1,581.250 ns | 51,941.80 ns | 2.1973 |      - |   20736 B |
| &#39;B1 BS to AD, BSDateConverter&#39;             | .NET 10.0 |    599.51 ns |     5.036 ns |     3.932 ns |    600.83 ns | 0.0458 |      - |     464 B |
| &#39;B2 AD to BS, BSDateConverter&#39;             | .NET 10.0 |  5,829.35 ns |    57.107 ns |    50.624 ns |  5,839.93 ns |      - |      - |     296 B |
| &#39;B1 BS to AD, BsadConverter&#39;               | .NET 10.0 |    129.84 ns |     2.386 ns |     3.987 ns |    128.51 ns | 0.0124 |      - |     120 B |
| &#39;B2 AD to BS, BsadConverter&#39;               | .NET 10.0 |    639.36 ns |    12.548 ns |    17.996 ns |    640.47 ns | 0.1011 |      - |     960 B |
| &#39;B1 BS to AD, NepaliUtility.Core&#39;          | .NET 10.0 |    354.81 ns |     2.632 ns |     2.333 ns |    354.53 ns |      - |      - |      32 B |
| &#39;B2 AD to BS, NepaliUtility.Core&#39;          | .NET 10.0 |  2,268.19 ns |    42.036 ns |    37.264 ns |  2,258.78 ns |      - |      - |      32 B |
| &#39;B1 BS to AD, OSN.NepaliCalendar&#39;          | .NET 10.0 |     12.90 ns |     0.154 ns |     0.136 ns |     12.91 ns |      - |      - |         - |
| &#39;B2 AD to BS, OSN.NepaliCalendar&#39;          | .NET 10.0 |     24.66 ns |     0.259 ns |     0.216 ns |     24.69 ns |      - |      - |         - |
| &#39;B1 BS to AD, NepaliCalendarBS&#39;            | .NET 8.0  | 13,728.32 ns |   208.851 ns |   185.141 ns | 13,709.09 ns | 0.0610 |      - |     688 B |
| &#39;B2 AD to BS, NepaliCalendarBS&#39;            | .NET 8.0  |    190.12 ns |     2.501 ns |     2.089 ns |    190.48 ns | 0.0033 |      - |      32 B |
| &#39;B1 BS to AD, NepaliDateConverter.Net&#39;     | .NET 8.0  | 25,313.93 ns |   500.449 ns |   733.552 ns | 25,196.48 ns | 2.1362 | 0.0610 |   20176 B |
| &#39;B2 AD to BS, NepaliDateConverter.Net&#39;     | .NET 8.0  | 70,923.07 ns |   919.674 ns |   767.970 ns | 70,711.71 ns | 2.0752 |      - |   20156 B |
| &#39;B1 BS to AD, NepaliDateConverter.NETCORE&#39; | .NET 8.0  | 25,473.47 ns |   492.775 ns |   460.942 ns | 25,393.21 ns | 2.1973 | 0.1221 |   20896 B |
| &#39;B2 AD to BS, NepaliDateConverter.NETCORE&#39; | .NET 8.0  | 77,523.20 ns | 2,970.251 ns | 8,474.293 ns | 74,267.02 ns | 2.1973 | 0.1221 |   20876 B |
| &#39;B1 BS to AD, BSDateConverter&#39;             | .NET 8.0  |  3,621.91 ns |    38.701 ns |    34.308 ns |  3,622.33 ns | 0.0305 |      - |     464 B |
| &#39;B2 AD to BS, BSDateConverter&#39;             | .NET 8.0  |  8,403.05 ns |   107.318 ns |    95.135 ns |  8,426.63 ns |      - |      - |     312 B |
| &#39;B1 BS to AD, BsadConverter&#39;               | .NET 8.0  |    140.31 ns |     1.989 ns |     1.860 ns |    139.51 ns | 0.0126 |      - |     120 B |
| &#39;B2 AD to BS, BsadConverter&#39;               | .NET 8.0  |    754.82 ns |    11.990 ns |    11.215 ns |    757.28 ns | 0.1011 |      - |     960 B |
| &#39;B1 BS to AD, NepaliUtility.Core&#39;          | .NET 8.0  |    425.79 ns |     3.005 ns |     2.663 ns |    426.24 ns |      - |      - |      32 B |
| &#39;B2 AD to BS, NepaliUtility.Core&#39;          | .NET 8.0  |  2,698.63 ns |    52.758 ns |    49.350 ns |  2,703.48 ns |      - |      - |      32 B |
| &#39;B1 BS to AD, OSN.NepaliCalendar&#39;          | .NET 8.0  |     15.98 ns |     0.305 ns |     0.314 ns |     15.99 ns |      - |      - |         - |
| &#39;B2 AD to BS, OSN.NepaliCalendar&#39;          | .NET 8.0  |     27.42 ns |     0.364 ns |     0.323 ns |     27.35 ns |      - |      - |         - |
