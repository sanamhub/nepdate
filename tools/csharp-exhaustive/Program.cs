// Dumps what C# NepDate computes for every supported day. Output: bs2ad.tsv, ad2bs.tsv, patro.tsv.
// Usage: dotnet run -c Release --project tools/csharp-exhaustive -p:NepDateSource=<clone> -- <out-dir>
using System;
using System.IO;
using System.Text;
using NepDate;

var outDir = args[0];
Directory.CreateDirectory(outDir);
var utf8 = new UTF8Encoding(false);

// 1. Every BS date the C# code accepts: AD date, weekday, day of year.
using (var w = new StreamWriter(Path.Combine(outDir, "bs2ad.tsv"), false, utf8))
{
    w.NewLine = "\n";
    for (int y = 1901; y <= 2199; y++)
        for (int m = 1; m <= 12; m++)
        {
            int len = new NepaliDate(y, m, 1).MonthEndDay;
            for (int d = 1; d <= len; d++)
            {
                var n = new NepaliDate(y, m, d);
                w.WriteLine($"{y:D4}-{m:D2}-{d:D2}\t{n.EnglishDate:yyyy-MM-dd}\t{(int)n.DayOfWeek}\t{n.DayOfYear}");
            }
            // One past the month end must be rejected.
            try { new NepaliDate(y, m, len + 1); w.WriteLine($"ACCEPTED {y}-{m}-{len + 1}"); } catch (ArgumentOutOfRangeException) { }
        }
}

// 2. Every AD date in range to BS.
using (var w = new StreamWriter(Path.Combine(outDir, "ad2bs.tsv"), false, utf8))
{
    w.NewLine = "\n";
    var min = NepaliDate.MinValue.EnglishDate; var max = NepaliDate.MaxValue.EnglishDate;
    w.WriteLine($"# min {min:yyyy-MM-dd} max {max:yyyy-MM-dd}");
    for (var a = min; a <= max; a = a.AddDays(1))
    {
        var n = new NepaliDate(a);
        w.WriteLine($"{a:yyyy-MM-dd}\t{n.Year:D4}-{n.Month:D2}-{n.Day:D2}");
    }
    foreach (var edge in new[] { min.AddDays(-1), max.AddDays(1) })
    {
        try { new NepaliDate(edge); w.WriteLine($"# edge {edge:yyyy-MM-dd} ACCEPTED"); }
        catch (Exception e) { w.WriteLine($"# edge {edge:yyyy-MM-dd} {e.GetType().Name}"); }
    }
}

// 3. Every metadata-bearing day, via the public API.
using (var w = new StreamWriter(Path.Combine(outDir, "patro.tsv"), false, utf8))
{
    w.NewLine = "\n";
    for (int y = 1901; y <= 2199; y++)
        for (int m = 1; m <= 12; m++)
        {
            int len = new NepaliDate(y, m, 1).MonthEndDay;
            for (int d = 1; d <= len; d++)
            {
                var info = new NepaliDate(y, m, d).GetCalendarInfo();
                if (info.TithiEn.Length == 0 && info.TithiNp.Length == 0 && !info.IsPublicHoliday && info.EventsEn.Length == 0) continue;
                w.WriteLine($"{y:D4}-{m:D2}-{d:D2}\t{info.TithiNp}\t{info.TithiEn}\t{(info.IsPublicHoliday ? 1 : 0)}\t{string.Join("|", info.EventsNp)}\t{string.Join("|", info.EventsEn)}");
            }
        }
}
Console.WriteLine("done");
