using BenchmarkDotNet.Attributes;
using BsadPatro = BsadConverter.Patro;
using BsCalendar = NepaliCalendarBS.NepaliCalendar;
using BsDateConv = BSDateConverter.DateConverter;
using NdcCore = global::NepaliDateConverter.DateConverter;
using NdcNet = global::NepaliDateConverter.Net.DateConverter;
using OsnConverter = OSN.NepaliCalendar.NepaliDateConverter;
using OsnDate = OSN.NepaliCalendar.NepaliDate;
using ToolkitConverter = NepaliCalendarToolkit.Converters.NepaliCalendarConverter;
using ToolkitDate = NepaliCalendarToolkit.Models.NepaliDate;
using UtilityConverter = NepaliUtility.Services.BsAdConverter;
using UtilityDate = NepaliUtility.Models.NepaliDate;

namespace DotnetBench;

/// <summary>
/// B1 (BS to AD) and B2 (AD to BS) of spec/BENCHMARK.md §3 for the other C# BS converters on
/// nuget.org, on the same 64 inputs and job settings as <see cref="Benchmarks"/>. Each method calls
/// the library's own conversion API in its own input shape: libraries that take strings get the
/// strings built once in setup, the way B6 gets its text. NepaliCalendarToolkit is only in the
/// agreement check: it throws on most of the 64 inputs, so a timing would measure exceptions.
/// </summary>
[MemoryDiagnoser]
public class CompetitorBenchmarks
{
    private const int Ops = Inputs.Count;

    private (int Y, int M, int D)[] _bs = null!;
    private (int Y, int M, int D)[] _ad = null!;
    private string[] _bsSlash = null!;
    private string[] _bsDash = null!;
    private string[] _adDash = null!;

    [GlobalSetup]
    public void Setup()
    {
        _bs = Inputs.Bs;
        _ad = Inputs.Ad;
        _bsSlash = Inputs.Text;
        _bsDash = Competitors.BsDash;
        _adDash = Competitors.AdDash;
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

    [Benchmark(Description = "B1 BS to AD, NepaliDateConverter.Net", OperationsPerInvoke = Ops)]
    public int B1_NepaliDateConverterNet()
    {
        var acc = 0;
        foreach (var (y, m, d) in _bs)
        {
            var ad = NdcNet.ConvertToEnglish(y, m, d);
            acc += ad.Year + ad.Month + ad.Day;
        }
        return acc;
    }

    [Benchmark(Description = "B2 AD to BS, NepaliDateConverter.Net", OperationsPerInvoke = Ops)]
    public int B2_NepaliDateConverterNet()
    {
        var acc = 0;
        foreach (var (y, m, d) in _ad)
        {
            var bs = NdcNet.ConvertToNepali(y, m, d);
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

    [Benchmark(Description = "B1 BS to AD, BSDateConverter", OperationsPerInvoke = Ops)]
    public int B1_BSDateConverter()
    {
        var acc = 0;
        foreach (var s in _bsDash)
            acc += BsDateConv.ConvertBSToAD(s).Length;
        return acc;
    }

    [Benchmark(Description = "B2 AD to BS, BSDateConverter", OperationsPerInvoke = Ops)]
    public int B2_BSDateConverter()
    {
        var acc = 0;
        foreach (var s in _adDash)
            acc += BsDateConv.ConvertADToBS(s).Length;
        return acc;
    }

    [Benchmark(Description = "B1 BS to AD, BsadConverter", OperationsPerInvoke = Ops)]
    public int B1_BsadConverter()
    {
        var acc = 0;
        foreach (var (y, m, d) in _bs)
            acc += BsadPatro.BsToAd(y, m, d).Length;
        return acc;
    }

    [Benchmark(Description = "B2 AD to BS, BsadConverter", OperationsPerInvoke = Ops)]
    public int B2_BsadConverter()
    {
        var acc = 0;
        foreach (var (y, m, d) in _ad)
        {
            var bs = BsadPatro.AdToBs(y, m, d);
            acc += bs.Year + bs.Month + bs.Day;
        }
        return acc;
    }

    [Benchmark(Description = "B1 BS to AD, NepaliUtility.Core", OperationsPerInvoke = Ops)]
    public int B1_NepaliUtilityCore()
    {
        var acc = 0;
        foreach (var (y, m, d) in _bs)
        {
            var ad = UtilityConverter.BsToAd(new UtilityDate(y, m, d));
            acc += ad.Year + ad.Month + ad.Day;
        }
        return acc;
    }

    [Benchmark(Description = "B2 AD to BS, NepaliUtility.Core", OperationsPerInvoke = Ops)]
    public int B2_NepaliUtilityCore()
    {
        var acc = 0;
        foreach (var (y, m, d) in _ad)
        {
            var bs = UtilityConverter.AdToBs(new DateTime(y, m, d));
            acc += bs.Year + bs.Month + bs.Day;
        }
        return acc;
    }

    [Benchmark(Description = "B1 BS to AD, OSN.NepaliCalendar", OperationsPerInvoke = Ops)]
    public int B1_OsnNepaliCalendar()
    {
        var acc = 0;
        foreach (var (y, m, d) in _bs)
        {
            var ad = OsnConverter.ToGregorian(new OsnDate(y, m, d));
            acc += ad.Year + ad.Month + ad.Day;
        }
        return acc;
    }

    [Benchmark(Description = "B2 AD to BS, OSN.NepaliCalendar", OperationsPerInvoke = Ops)]
    public int B2_OsnNepaliCalendar()
    {
        var acc = 0;
        foreach (var (y, m, d) in _ad)
        {
            var bs = OsnConverter.ToNepali(new DateTime(y, m, d));
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
    public static readonly string[] BsDash = Inputs.Bs.Select(b => $"{b.Y:D4}-{b.M:D2}-{b.D:D2}").ToArray();
    public static readonly string[] AdDash = Inputs.Ad.Select(a => $"{a.Y:D4}-{a.M:D2}-{a.D:D2}").ToArray();

    private sealed record Library(string Name, Func<int, (int, int, int)> B1, Func<int, (int, int, int)> B2);

    private static readonly Library[] Libraries =
    [
        new("NepaliCalendarBS",
            i => Ymd(BsCalendar.Convert_BS2AD(Inputs.Text[i])),
            i => { var r = BsCalendar.Convert_AD2BS(AdAt(i)); return (r.Year, r.Month, r.Day); }),
        new("NepaliDateConverter.Net",
            i => { var (y, m, d) = Inputs.Bs[i]; var r = NdcNet.ConvertToEnglish(y, m, d); return (r.Year, r.Month, r.Day); },
            i => { var (y, m, d) = Inputs.Ad[i]; var r = NdcNet.ConvertToNepali(y, m, d); return (r.Year, r.Month, r.Day); }),
        new("NepaliDateConverter.NETCORE",
            i => { var (y, m, d) = Inputs.Bs[i]; var r = NdcCore.ConvertToEnglish(y, m, d); return (r.Year, r.Month, r.Day); },
            i => { var (y, m, d) = Inputs.Ad[i]; var r = NdcCore.ConvertToNepali(y, m, d); return (r.Year, r.Month, r.Day); }),
        new("NepaliCalendarToolkit",
            i => { var (y, m, d) = Inputs.Bs[i]; return Ymd(ToolkitConverter.ConvertToAd(new ToolkitDate(y, m, d))); },
            i => { var r = ToolkitConverter.ConvertToNepali(AdAt(i)); return (r.GetYear, r.GetMonth, r.GetDay); }),
        new("BSDateConverter",
            i => Ymd(BsDateConv.ConvertBSToAD(BsDash[i])),
            i => Ymd(BsDateConv.ConvertADToBS(AdDash[i]))),
        new("BsadConverter",
            i => { var (y, m, d) = Inputs.Bs[i]; return Ymd(BsadPatro.BsToAd(y, m, d)); },
            i => { var (y, m, d) = Inputs.Ad[i]; var r = BsadPatro.AdToBs(y, m, d); return (r.Year, r.Month, r.Day); }),
        new("NepaliUtility.Core",
            i => { var (y, m, d) = Inputs.Bs[i]; return Ymd(UtilityConverter.BsToAd(new UtilityDate(y, m, d))); },
            i => { var r = UtilityConverter.AdToBs(AdAt(i)); return (r.Year, r.Month, r.Day); }),
        new("OSN.NepaliCalendar",
            i => { var (y, m, d) = Inputs.Bs[i]; return Ymd(OsnConverter.ToGregorian(new OsnDate(y, m, d))); },
            i => { var r = OsnConverter.ToNepali(AdAt(i)); return (r.Year, r.Month, r.Day); }),
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
            misses.Add($"{Inputs.Text[i]} / {AdDash[i]}: {got}");
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

    // Libraries that return text use YYYY-MM-DD or YYYY/MM/DD.
    private static (int, int, int) Ymd(string s)
    {
        var p = s.Split('-', '/');
        return (int.Parse(p[0]), int.Parse(p[1]), int.Parse(p[2]));
    }
}
