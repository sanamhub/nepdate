```

BenchmarkDotNet v0.15.8, Windows 11 (10.0.26300.9818)
12th Gen Intel Core i5-12500H 3.10GHz, 1 CPU, 16 logical and 12 physical cores
.NET SDK 10.0.403
  [Host]     : .NET 10.0.14 (10.0.14, 10.0.1426.52326), X64 RyuJIT x86-64-v3
  DefaultJob : .NET 10.0.14 (10.0.14, 10.0.1426.52326), X64 RyuJIT x86-64-v3


```
| Method                                 | Categories | Mean          | Error         | StdDev        | Ratio    | RatioSD | Rank | Gen0   | Gen1   | Allocated | Alloc Ratio |
|--------------------------------------- |----------- |--------------:|--------------:|--------------:|---------:|--------:|-----:|-------:|-------:|----------:|------------:|
| GetNepDate_NepDate                     | EngToNep   |     18.423 ns |     0.3278 ns |     0.2906 ns |     1.00 |    0.02 |    1 |      - |      - |         - |          NA |
| GetNepDate_NepaliDateConverter_NETCORE | EngToNep   | 88,677.596 ns | 1,711.3885 ns | 3,172.1685 ns | 4,814.45 |  184.91 |    4 | 2.1973 |      - |   20688 B |          NA |
| GetNepDate_NepaliCalendarBS            | EngToNep   |    203.936 ns |     3.6771 ns |     3.4396 ns |    11.07 |    0.25 |    2 | 0.0033 |      - |      32 B |          NA |
| GetNepDate_NepaliDateConverter_Net     | EngToNep   | 83,759.314 ns |   898.0073 ns |   796.0601 ns | 4,547.43 |   79.81 |    3 | 1.9531 |      - |   19968 B |          NA |
|                                        |            |               |               |               |          |         |      |        |        |           |             |
| GetEngDate_NepDate                     | NepToEng   |      7.580 ns |     0.0634 ns |     0.0562 ns |     1.00 |    0.01 |    1 |      - |      - |         - |          NA |
| GetEngDate_NepaliDateConverter_NETCORE | NepToEng   | 33,529.459 ns |   538.1117 ns |   821.7535 ns | 4,423.79 |  111.36 |    3 | 2.1973 |      - |   20688 B |          NA |
| GetEngDate_NepaliCalendarBS            | NepToEng   | 17,705.162 ns |   232.3640 ns |   217.3535 ns | 2,335.98 |   32.41 |    2 | 0.0610 |      - |     688 B |          NA |
| GetEngDate_NepaliDateConverter_Net     | NepToEng   | 41,861.363 ns |   372.7028 ns |   311.2237 ns | 5,523.09 |   55.92 |    4 | 2.0752 | 0.0610 |   19968 B |          NA |
