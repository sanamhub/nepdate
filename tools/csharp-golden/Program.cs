// Golden-vector generator: records the behaviour of the C# NepDate library (NuGet 2.0.7)
// so the Rust port (and future ports) can prove parity. See docs/adr/0009-parity-and-deviations.md.
// Output: tab-separated files (long dates contain commas). "ERR" marks an exception / false TryParse.
using System.Text;
using NepDate;

var outDir = args.Length > 0 ? args[0] : "spec/vectors/csharp-golden";
Directory.CreateDirectory(outDir);

var years = new[] { 1901, 1902, 1950, 2000, 2001, 2050, 2077, 2078, 2079, 2080, 2081, 2082, 2083, 2084, 2087, 2090, 2100, 2150, 2198, 2199 };
var dates = new List<NepaliDate>();
foreach (var y in years)
    for (var m = 1; m <= 12; m++)
    {
        var last = new NepaliDate(y, m, 1).MonthEndDay;
        foreach (var d in new[] { 1, 15, last }) dates.Add(new NepaliDate(y, m, d));
    }
var rng = new Random(42);
var min = NepaliDate.MinValue.EnglishDate;
var span = (NepaliDate.MaxValue.EnglishDate - min).Days;
for (var i = 0; i < 300; i++) dates.Add(new NepaliDate(min.AddDays(rng.Next(0, span + 1))));
dates = dates.Distinct().OrderBy(x => x).ToList();

static string Bs(NepaliDate d) => $"{d.Year:D4}-{d.Month:D2}-{d.Day:D2}";
static string Try(Func<string> f) { try { return f(); } catch { return "ERR"; } }

Write("dates.tsv",
    "bs\tad\tweekday\tday_of_year\tmonth_length\tto_string\tunicode\tlong_en\tlong_en_weekday\tlong_ne\tlong_ne_weekday\tdmy_dash_nopad\tfy_start\tfy_end\tquarter_start\tquarter_end",
    dates.Select(d => string.Join('\t',
        Bs(d), d.EnglishDate.ToString("yyyy-MM-dd"), d.DayOfWeek, d.DayOfYear, d.MonthEndDay,
        d.ToString(), d.ToUnicodeString(),
        d.ToLongDateString(), d.ToLongDateString(displayDayName: true),
        d.ToLongDateUnicodeString(), d.ToLongDateUnicodeString(displayDayName: true),
        d.ToString(DateFormats.DayMonthYear, Separators.Dash, leadingZeros: false),
        Try(() => Bs(d.FiscalYearStartDate())), Try(() => Bs(d.FiscalYearEndDate())),
        Try(() => Bs(d.FiscalYearQuarterStartDate())), Try(() => Bs(d.FiscalYearQuarterEndDate())))));

var dayDeltas = new[] { -1000, -400, -32, -1, 1, 29, 32, 365, 1000 };
Write("add-days.tsv", "bs\tdays\tresult",
    dates.SelectMany(d => dayDeltas.Select(n => $"{Bs(d)}\t{n}\t{Try(() => Bs(d.AddDays(n)))}")));

var monthDeltas = new[] { -25, -12, -5, -2, -1, 1, 2, 5, 12, 25 };
Write("add-months.tsv", "bs\tmonths\tclamp\toverflow",
    dates.SelectMany(d => monthDeltas.Select(n =>
        $"{Bs(d)}\t{n}\t{Try(() => Bs(d.AddMonths(n)))}\t{Try(() => Bs(d.AddMonths(n, awayFromMonthEnd: true)))}")));

var parseInputs = new[]
{
    "2080/05/15", "2080-05-15", "2080.05.15", "2080_05_15", "2080 05 15", @"2080\05\15", "2080।05।15", "2080|05|15",
    "2080/5/15", "  2080 / 05 / 15  ", "2080//05//15", "/2080/05/15/", "2080/13/01", "2080/05/40", "2080/05",
    "2080", "2080/05/15/99", "abc/def/ghi", "", "1900/12/30", "1901/01/01", "2199/12/30", "2199/12/31", "2200/01/01",
    "२०८०/०५/१५", "2081/04/32", "2081/09/30", "15/05/2080", "80/05/15", "2080-5-1",
    "15 Shrawan 2080", "Shrawan 15, 2080", "15 साउन 2080", "१५ श्रावण २०८०", "2080/04/15 BS", "2080/04/15 B.S.",
    "15 साउन, 2080 गते", "Baisakh 1, 2081", "1 Baishakh 2081", "30 Chaitra 2080", "10/05/20", "not a date",
};
Write("parse.tsv", "input\tstrict\tsmart",
    parseInputs.Select(s =>
        $"{s}\t{(NepaliDate.TryParse(s, out var a) ? Bs(a) : "ERR")}\t{(SmartDateParser.TryParse(s, out var b) ? Bs(b) : "ERR")}"));

var formatPatterns = new[] { "yyyy-MM-dd", "M/d/yyyy", "yy", "yyyy'BS'", @"yyyy\M\M-\d\d", "MMM yyyy", "MMMM d, yyyy", "d", "D", "s", "dd.MM.yy" };
Write("format-pattern.tsv", "bs\tpattern\tresult",
    dates.Where((_, i) => i % 25 == 0).SelectMany(d => formatPatterns.Select(p => $"{Bs(d)}\t{p}\t{d.ToString(p, null)}")));

Console.WriteLine($"wrote {dates.Count} dates to {outDir}");

void Write(string name, string header, IEnumerable<string> rows)
{
    var sb = new StringBuilder(header).Append('\n');
    foreach (var r in rows) sb.Append(r).Append('\n');
    File.WriteAllText(Path.Combine(outDir, name), sb.ToString(), new UTF8Encoding(false));
}
