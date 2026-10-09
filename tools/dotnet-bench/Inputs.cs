using System.Reflection;
using System.Text.Json;
using NepDate;

namespace DotnetBench;

/// <summary>
/// The inputs of spec/BENCHMARK.md §2 and §3, computed from data/calendar/bs-calendar.json with the
/// serial model of spec/ALGORITHM.md §2 and §4, then checked against NepDate so a wrong input set
/// fails before anything is measured.
/// </summary>
public static class Inputs
{
    public const int Count = 64;

    private const int MinYear = 1901;
    private static readonly DateTime EpochAd = new(1844, 4, 11);

    public static readonly (int Y, int M, int D)[] Bs;
    public static readonly (int Y, int M, int D)[] Ad;
    public static readonly string[] Text;
    public static readonly (int Y, int M, int D)[] PatroBs;
    public static readonly int[] Serials;
    public static readonly int[] PatroSerials;

    private static readonly int[][] Len;
    private static readonly int[] YearStart;

    static Inputs()
    {
        Len = LoadMonthLengths();
        YearStart = new int[Len.Length + 1];
        for (var i = 0; i < Len.Length; i++)
            YearStart[i + 1] = YearStart[i] + Len[i].Sum();

        Serials = Spread(ToSerial(2000, 1, 1), ToSerial(2090, 12, 30));
        PatroSerials = Spread(ToSerial(2077, 1, 1), ToSerial(2084, 8, 20));

        Bs = Serials.Select(FromSerial).ToArray();
        PatroBs = PatroSerials.Select(FromSerial).ToArray();
        Ad = Serials.Select(s => { var d = EpochAd.AddDays(s); return (d.Year, d.Month, d.Day); }).ToArray();
        Text = Bs.Select(b => $"{b.Y:D4}/{b.M:D2}/{b.D:D2}").ToArray();

        Verify();
    }

    // BENCHMARK §2: date i = s0 + i * ((s1 - s0) / 63), integer division.
    private static int[] Spread(int s0, int s1)
    {
        var step = (s1 - s0) / (Count - 1);
        return Enumerable.Range(0, Count).Select(i => s0 + i * step).ToArray();
    }

    private static int ToSerial(int y, int m, int d)
    {
        var s = YearStart[y - MinYear];
        for (var k = 1; k < m; k++) s += Len[y - MinYear][k - 1];
        return s + d - 1;
    }

    private static (int, int, int) FromSerial(int s)
    {
        var i = Array.BinarySearch(YearStart, s);
        if (i < 0) i = ~i - 1;
        var r = s - YearStart[i];
        var m = 1;
        while (r >= Len[i][m - 1]) { r -= Len[i][m - 1]; m++; }
        return (MinYear + i, m, r + 1);
    }

    private static int[][] LoadMonthLengths()
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("bs-calendar.json")
            ?? throw new InvalidOperationException("bs-calendar.json is not embedded");
        using var doc = JsonDocument.Parse(stream);
        return doc.RootElement.GetProperty("month_lengths").EnumerateObject()
            .OrderBy(p => int.Parse(p.Name))
            .Select(p => p.Value.EnumerateArray().Select(v => v.GetInt32()).ToArray())
            .ToArray();
    }

    // The inputs come from the hub data; NepDate must agree on every one of them or the run stops.
    private static void Verify()
    {
        for (var i = 0; i < Count; i++)
        {
            var (y, m, d) = Bs[i];
            var nd = new NepaliDate(y, m, d);
            var ad = nd.EnglishDate;
            if ((ad.Year, ad.Month, ad.Day) != Ad[i])
                throw new InvalidOperationException($"NepDate disagrees with data/ for BS {Text[i]}: {ad:yyyy-MM-dd}");
            if (!NepaliDate.TryParse(Text[i], out var parsed) || parsed != nd)
                throw new InvalidOperationException($"NepDate cannot parse {Text[i]}");
        }
        var c0 = new NepaliDate(2077, 1, 1).EnglishDate;
        for (var i = 0; i < Count; i++)
        {
            var (y, m, d) = PatroBs[i];
            if ((new NepaliDate(y, m, d).EnglishDate - c0).Days != PatroSerials[i] - PatroSerials[0])
                throw new InvalidOperationException($"NepDate disagrees with data/ for patro input {y}-{m}-{d}");
        }
    }
}
