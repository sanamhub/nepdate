```

BenchmarkDotNet v0.15.8, Windows 11 (10.0.26300.9818)
12th Gen Intel Core i5-12500H 3.10GHz, 1 CPU, 16 logical and 12 physical cores
.NET SDK 10.0.403
  [Host]     : .NET 10.0.14 (10.0.14, 10.0.1426.52326), X64 RyuJIT x86-64-v3
  Job-RXNKYN : .NET 10.0.14 (10.0.14, 10.0.1426.52326), X64 RyuJIT x86-64-v3
  Job-RTDGQM : .NET 8.0.33 (8.0.33, 8.0.3326.52219), X64 RyuJIT x86-64-v3

Affinity=0000000000000100  

```
| Method        | Runtime   | Mean     | Error    | StdDev   | Allocated |
|-------------- |---------- |---------:|---------:|---------:|----------:|
| &#39;B1 BS to AD&#39; | .NET 10.0 | 15.10 ns | 0.302 ns | 0.728 ns |         - |
| &#39;B2 AD to BS&#39; | .NET 10.0 | 21.60 ns | 0.428 ns | 0.509 ns |         - |
| &#39;B1 BS to AD&#39; | .NET 8.0  | 14.23 ns | 0.213 ns | 0.178 ns |         - |
| &#39;B2 AD to BS&#39; | .NET 8.0  | 26.28 ns | 0.338 ns | 0.300 ns |         - |
