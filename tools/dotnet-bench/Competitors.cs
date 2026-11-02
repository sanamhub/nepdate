using BenchmarkDotNet.Attributes;
using BsCalendar = NepaliCalendarBS.NepaliCalendar;
using Dcn = DateConverterNepali.DateConverter;
using NdcCore = global::NepaliDateConverter.DateConverter;

namespace DotnetBench;

/// <summary>
/// B1 (BS to AD) and B2 (AD to BS) of spec/BENCHMARK.md section 3 for the selected C# BS converters
/// on nuget.org, on the same 64 inputs and job settings as <see cref="Benchmarks"/>. Each method
/// calls the library's own conversion API in its own input shape. Selection and usage are in
/// docs/benchmarks/dotnet.md.
/// </summary>
[MemoryDiagnoser]
public class CompetitorBenchmarks
{
    private const int Ops = Inputs.Count;

    private (int Y, int M, int D)[] _bs = null!;
    private (int Y, int M, int D)[] _ad = null!;
    private string[] _bsSlash = null!;

    [GlobalSetup]
    public void Setup()
    {
        _bs = Inputs.Bs;
        _ad = Inputs.Ad;
        _bsSlash = Inputs.Text;
    }

    [Benchmark(Description = "B1 BS to AD, DateConverterNepali", OperationsPerInvoke = Ops)]
    public int B1_DateConverterNepali()
    {
        var acc = 0;
        foreach (var (y, m, d) in _bs)
        {
            var ad = Dcn.GetDateInAD(y, m, d);
            acc += ad.engYear + ad.engMonth + ad.engDay;
        }
        return acc;
    }

    [Benchmark(Description = "B2 AD to BS, DateConverterNepali", OperationsPerInvoke = Ops)]
    public int B2_DateConverterNepali()
    {
        var acc = 0;
        foreach (var (y, m, d) in _ad)
        {
            var bs = Dcn.GetDateInBS(y, m, d);
            acc += bs.npYear + bs.npMonth + bs.npDay;
        }
        return acc;
    }

    [Benchmark(Description = "B1 BS to AD, NepaliCalendarBS", OperationsPerInvoke = Ops)]
    public int B1_NepaliCalendarBS()
    {
        var acc = 0;
        foreach (var s in _bsSlash)
        {
            var ad = BsCalendar.Convert_BS2AD(s);
            acc += ad.Year + ad.Month + ad.Day;
        }
        return acc;
    }

    [Benchmark(Description = "B2 AD to BS, NepaliCalendarBS", OperationsPerInvoke = Ops)]
    public int B2_NepaliCalendarBS()
    {
        var acc = 0;
        foreach (var (y, m, d) in _ad)
        {
            var bs = BsCalendar.Convert_AD2BS(new DateTime(y, m, d));
            acc += bs.Year + bs.Month + bs.Day;
        }
        return acc;
    }

    [Benchmark(Description = "B1 BS to AD, NepaliDateConverter.NETCORE", OperationsPerInvoke = Ops)]
    public int B1_NepaliDateConverterNetCore()
    {
        var acc = 0;
        foreach (var (y, m, d) in _bs)
        {
            var ad = NdcCore.ConvertToEnglish(y, m, d);
            acc += ad.Year + ad.Month + ad.Day;
        }
        return acc;
    }

    [Benchmark(Description = "B2 AD to BS, NepaliDateConverter.NETCORE", OperationsPerInvoke = Ops)]
    public int B2_NepaliDateConverterNetCore()
    {
        var acc = 0;
        foreach (var (y, m, d) in _ad)
        {
            var bs = NdcCore.ConvertToNepali(y, m, d);
            acc += bs.Year + bs.Month + bs.Day;
        }
        return acc;
    }
}

/// <summary>
/// The agreement check for <see cref="CompetitorBenchmarks"/>: each library's B1 and B2 result on
/// the 64 inputs, compared with the hub calendar data (which NepDate matches, see
/// <see cref="Inputs"/>). An input that throws counts as a disagreement.
/// </summary>
public static class Competitors
{
    private sealed record Library(string Name, Func<int, (int, int, int)> B1, Func<int, (int, int, int)> B2);

    private static readonly Library[] Libraries =
    [
        new("DateConverterNepali",
            i => { var (y, m, d) = Inputs.Bs[i]; var r = Dcn.GetDateInAD(y, m, d); return (r.engYear, r.engMonth, r.engDay); },
            i => { var (y, m, d) = Inputs.Ad[i]; var r = Dcn.GetDateInBS(y, m, d); return (r.npYear, r.npMonth, r.npDay); }),
        new("NepaliCalendarBS",
            i => Ymd(BsCalendar.Convert_BS2AD(Inputs.Text[i])),
            i => { var r = BsCalendar.Convert_AD2BS(AdAt(i)); return (r.Year, r.Month, r.Day); }),
        new("NepaliDateConverter.NETCORE",
            i => { var (y, m, d) = Inputs.Bs[i]; var r = NdcCore.ConvertToEnglish(y, m, d); return (r.Year, r.Month, r.Day); },
            i => { var (y, m, d) = Inputs.Ad[i]; var r = NdcCore.ConvertToNepali(y, m, d); return (r.Year, r.Month, r.Day); }),
    ];

    /// <summary>Prints, per library and operation, on how many of the 64 inputs it agrees.</summary>
    public static void PrintAgreement()
    {
        foreach (var lib in Libraries)
        {
            Report(lib.Name, "B1", lib.B1, Inputs.Ad);
            Report(lib.Name, "B2", lib.B2, Inputs.Bs);
        }
    }

    private static void Report(string name, string op, Func<int, (int, int, int)> convert, (int Y, int M, int D)[] expected)
    {
        var agree = 0;
        var throws = 0;
        var misses = new List<string>();
        for (var i = 0; i < Inputs.Count; i++)
        {
            string got;
            try
            {
                var r = convert(i);
                if (r == expected[i]) { agree++; continue; }
                got = $"{r.Item1:D4}-{r.Item2:D2}-{r.Item3:D2}";
            }
            catch (Exception e)
            {
                got = e.GetType().Name;
                throws++;
            }
            misses.Add($"{Inputs.Text[i]} / {AdAt(i):yyyy-MM-dd}: {got}");
        }
        var thrown = throws > 0 ? $", throws on {throws}" : "";
        Console.WriteLine($"{name}\t{op}\tagrees on {agree} of {Inputs.Count}{thrown}");
        foreach (var miss in misses)
            Console.WriteLine($"\t\t{miss}");
    }

    private static DateTime AdAt(int i)
    {
        var (y, m, d) = Inputs.Ad[i];
        return new DateTime(y, m, d);
    }

    private static (int, int, int) Ymd(DateTime t) => (t.Year, t.Month, t.Day);

    // NepaliCalendarBS returns YYYY/MM/DD.
    private static (int, int, int) Ymd(string s)
    {
        var p = s.Split('-', '/');
        return (int.Parse(p[0]), int.Parse(p[1]), int.Parse(p[2]));
    }
}
