using System.Runtime.CompilerServices;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Environments;
using BenchmarkDotNet.Jobs;
using BenchmarkDotNet.Running;
using DotnetBench;
using NepDate;

Console.OutputEncoding = System.Text.Encoding.UTF8;

if (args.Length > 0 && args[0] == "--inputs")
{
    // Prints the 64 inputs and the struct size, for docs/benchmarks/dotnet.md and the ports.
    Console.WriteLine($"sizeof(NepaliDate) = {Unsafe.SizeOf<NepaliDate>()} bytes");
    for (var i = 0; i < Inputs.Count; i++)
    {
        var (y, m, d) = Inputs.Ad[i];
        var p = Inputs.PatroBs[i];
        Console.WriteLine($"{i}\t{Inputs.Serials[i]}\t{Inputs.Text[i]}\t{y:D4}-{m:D2}-{d:D2}\t{Inputs.PatroSerials[i]}\t{p.Y:D4}-{p.M:D2}-{p.D:D2}");
    }
    return;
}

if (args.Length > 0 && args[0] == "--agrees")
{
    // Checks the other C# libraries' B1 and B2 results against the hub data, for docs/benchmarks/dotnet.md.
    Competitors.PrintAgreement();
    return;
}

// spec/BENCHMARK.md §1: pin to logical CPU 2 (mask 0x4), a performance core on the reference machine.
var affinity = (IntPtr)0x4;
var config = DefaultConfig.Instance
    .AddJob(Job.Default.WithRuntime(CoreRuntime.Core10_0).WithAffinity(affinity))
    .AddJob(Job.Default.WithRuntime(CoreRuntime.Core80).WithAffinity(affinity))
    // NepaliCalendarBS ships a Debug build on nuget.org. That is the assembly its users get, so it
    // is measured as published instead of being refused by the optimizations check.
    .WithOptions(ConfigOptions.DisableOptimizationsValidator);

BenchmarkSwitcher.FromAssembly(typeof(Benchmarks).Assembly).Run(args, config);
