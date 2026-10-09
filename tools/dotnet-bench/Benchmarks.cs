using BenchmarkDotNet.Attributes;
using NepDate;

namespace DotnetBench;

/// <summary>
/// B1 to B8 of spec/BENCHMARK.md §3. Each method runs over the 64 inputs, so
/// OperationsPerInvoke = 64 makes BenchmarkDotNet report time and bytes per single operation.
/// Every result feeds the returned sum, so the JIT can't drop the work.
/// </summary>
[MemoryDiagnoser]
public class Benchmarks
{
    private const int Ops = Inputs.Count;

    private (int Y, int M, int D)[] _bs = null!;
    private (int Y, int M, int D)[] _ad = null!;
    private string[] _text = null!;
    private NepaliDate[] _dates = null!;
    private NepaliDate[] _patroDates = null!;

    [GlobalSetup]
    public void Setup()
    {
        _bs = Inputs.Bs;
        _ad = Inputs.Ad;
        _text = Inputs.Text;
        _dates = _bs.Select(b => new NepaliDate(b.Y, b.M, b.D)).ToArray();
        _patroDates = Inputs.PatroBs.Select(b => new NepaliDate(b.Y, b.M, b.D)).ToArray();
    }

    [Benchmark(Description = "B1 BS to AD", OperationsPerInvoke = Ops)]
    public int B1_BsToAd()
    {
        var acc = 0;
        foreach (var (y, m, d) in _bs)
        {
            var ad = new NepaliDate(y, m, d).EnglishDate;
            acc += ad.Year + ad.Month + ad.Day;
        }
        return acc;
    }

    [Benchmark(Description = "B2 AD to BS", OperationsPerInvoke = Ops)]
    public int B2_AdToBs()
    {
        var acc = 0;
        foreach (var (y, m, d) in _ad)
        {
            var bs = new NepaliDate(new DateTime(y, m, d));
            acc += bs.Year + bs.Month + bs.Day;
        }
        return acc;
    }

    [Benchmark(Description = "B3 add 1000 days", OperationsPerInvoke = Ops)]
    public int B3_AddDays()
    {
        var acc = 0;
        foreach (var date in _dates)
        {
            var r = date.AddDays(1000);
            acc += r.Year + r.Month + r.Day;
        }
        return acc;
    }

    [Benchmark(Description = "B4 add 13 months, Clamp", OperationsPerInvoke = Ops)]
    public int B4_AddMonthsClamp()
    {
        var acc = 0;
        foreach (var date in _dates)
        {
            var r = date.AddMonths(13);
            acc += r.Year + r.Month + r.Day;
        }
        return acc;
    }

    [Benchmark(Description = "B5 long format, Nepali, weekday", OperationsPerInvoke = Ops)]
    public int B5_LongNepali()
    {
        var acc = 0;
        foreach (var date in _dates)
            acc += date.ToLongDateUnicodeString(displayDayName: true).Length;
        return acc;
    }

    [Benchmark(Description = "B6 strict parse", OperationsPerInvoke = Ops)]
    public int B6_StrictParse()
    {
        var acc = 0;
        foreach (var s in _text)
        {
            if (NepaliDate.TryParse(s, out var r))
                acc += r.Year + r.Month + r.Day;
        }
        return acc;
    }

    [Benchmark(Description = "B7 patro info", OperationsPerInvoke = Ops)]
    public int B7_PatroInfo()
    {
        var acc = 0;
        foreach (var date in _patroDates)
            acc += Consume(date.GetCalendarInfo());
        return acc;
    }

    [Benchmark(Description = "B8 patro month grid", OperationsPerInvoke = Ops)]
    public int B8_MonthGrid()
    {
        var acc = 0;
        foreach (var date in _patroDates)
        {
            int y = date.Year, m = date.Month, last = date.MonthEndDay;
            for (var d = 1; d <= last; d++)
                acc += Consume(new NepaliDate(y, m, d).GetCalendarInfo());
        }
        return acc;
    }

    private static int Consume(NepDate.Core.Calendar.CalendarInfo info)
        => info.TithiNp.Length + info.TithiEn.Length + info.EventsNp.Length + info.EventsEn.Length
           + (info.IsPublicHoliday ? 1 : 0);
}
