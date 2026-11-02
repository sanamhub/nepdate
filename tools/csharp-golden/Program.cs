// Golden-vector generator: records the behaviour of the C# NepDate library (NuGet 2.0.7)
// so every port can prove parity. See docs/adr/0009-parity-and-deviations.md and spec/PARITY.md.
// Output: tab-separated files (long dates contain commas). "ERR" marks an exception / false
// TryParse. A line starting with '#' is a comment and is ignored by the readers.
//
// A row whose note is a D number holds the port's value, not the C# value. The D-16 rows first
// prove that C# throws ArgumentOutOfRangeException at the data end, then write the port value,
// so the C# error stays in the record.
//
// Targets net10.0 because the serialization rows need the System.Text.Json version the
// NepDate package references.
using System.Globalization;
using System.Text;
using System.Text.Json;
using NepDate;
using NepDate.Serialization;
using NepDate.TypeConversion;

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
static NepaliDate P(string text)
{
    var parts = text.Split('-').Select(int.Parse).ToArray();
    return new NepaliDate(parts[0], parts[1], parts[2]);
}
static string Range(NepaliDateRange range) => range.IsEmpty ? "none" : $"{Bs(range.Start)}..{Bs(range.End)}";
static string RangeList(IEnumerable<NepaliDateRange> ranges)
{
    var all = ranges.ToArray();
    return all.Length == 0 ? "none" : string.Join(";", all.Select(Range));
}
static string DateList(IEnumerable<NepaliDate> items)
{
    var all = items.ToArray();
    return all.Length == 0 ? "none" : string.Join(";", all.Select(Bs));
}
static string BoolText(bool value) => value ? "true" : "false";

// ---- D-16: a valid range never throws at the data end ----------------------
// C# advances one month, quarter or day past the last piece or date, and computes the day
// after a range end in IsAdjacentTo, so a range that reaches 2199-12-30 throws
// ArgumentOutOfRangeException. The port value is the last piece or date instead. Every D-16
// row below proves the C# error first, so the evidence stays in the generated record.
static void ProvesEndError(string what, Action call)
{
    try { call(); }
    catch (ArgumentOutOfRangeException) { return; }
    catch (Exception e) { throw new InvalidOperationException($"{what}: C# threw {e.GetType().Name}, expected ArgumentOutOfRangeException"); }
    throw new InvalidOperationException($"{what}: C# did not throw at the data end");
}
static IEnumerable<NepaliDate> EveryDayUntil(NepaliDate start, NepaliDate end)
{
    for (var d = start; ; d = d.AddDays(1))
    {
        yield return d;
        if (d >= end) yield break;
    }
}
static IEnumerable<NepaliDate> IntervalDaysUntil(NepaliDate start, NepaliDate end, int interval)
{
    var d = start;
    while (d <= end)
    {
        yield return d;
        if ((end.EnglishDate - d.EnglishDate).Days < interval) yield break;
        d = d.AddDays(interval);
    }
}
static IEnumerable<NepaliDate> WorkingDaysUntil(NepaliDate start, NepaliDate end, bool excludeSunday)
    => EveryDayUntil(start, end).Where(d => d.DayOfWeek != DayOfWeek.Saturday
        && (!excludeSunday || d.DayOfWeek != DayOfWeek.Sunday));
static IEnumerable<NepaliDate> WeekendDaysUntil(NepaliDate start, NepaliDate end, bool includeSunday)
    => EveryDayUntil(start, end).Where(d => d.DayOfWeek == DayOfWeek.Saturday
        || (includeSunday && d.DayOfWeek == DayOfWeek.Sunday));
static List<NepaliDateRange> SplitByMonthUntil(NepaliDate start, NepaliDate end)
{
    var pieces = new List<NepaliDateRange>();
    var s = start;
    while (true)
    {
        var last = new NepaliDate(s.Year, s.Month, new NepaliDate(s.Year, s.Month, 1).MonthEndDay);
        var pieceEnd = last < end ? last : end;
        pieces.Add(new NepaliDateRange(s, pieceEnd));
        if (pieceEnd >= end) return pieces;
        s = pieceEnd.AddDays(1);
    }
}
static List<NepaliDateRange> SplitByFiscalQuarterUntil(NepaliDate start, NepaliDate end)
{
    var pieces = new List<NepaliDateRange>();
    var s = start;
    while (true)
    {
        var endMonth = s.Month <= 3 ? 3 : s.Month <= 6 ? 6 : s.Month <= 9 ? 9 : 12;
        var last = new NepaliDate(s.Year, endMonth, new NepaliDate(s.Year, endMonth, 1).MonthEndDay);
        var pieceEnd = last < end ? last : end;
        pieces.Add(new NepaliDateRange(s, pieceEnd));
        if (pieceEnd >= end) return pieces;
        s = pieceEnd.AddDays(1);
    }
}

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
var formatPatternRows = dates.Where((_, i) => i % 25 == 0)
    .SelectMany(d => formatPatterns.Select(p => $"{Bs(d)}\t{p}\t{d.ToString(p, null)}"))
    .ToList();
// NF06: a backslash at the very end of a pattern is a literal backslash in C#. The row pins
// that output so every port follows FORMATTING.md section 5.
formatPatternRows.Add($"2081-04-15\t\\\t{P("2081-04-15").ToString("\\", null)}");
Write("format-pattern.tsv", "bs\tpattern\tresult", formatPatternRows);

// ---- day-diff.tsv (NA04, NA05; D-07) ---------------------------------------
// C# Subtract and operator - both return this - other. The port's named days_until method
// returns other - this, so both directions are recorded for the same pair.
{
    var pairs = new[]
    {
        ("1901-01-01", "1901-01-01"),
        ("1901-01-01", "1901-01-02"),
        ("1901-01-02", "1901-01-01"),
        ("1901-01-01", "2199-12-30"),
        ("2199-12-30", "1901-01-01"),
        ("2081-03-15", "2081-03-15"),
        ("2081-04-15", "2081-04-16"),
        ("2081-04-16", "2081-04-15"),
        ("2081-04-30", "2081-05-01"),
        ("2081-04-32", "2081-05-01"),
        ("2081-12-30", "2082-01-01"),
        ("2082-01-01", "2081-12-30"),
        ("2081-01-31", "2081-02-30"),
        ("2199-12-25", "2199-12-30"),
        ("2199-12-30", "2199-12-25"),
        ("1901-01-01", "2081-04-15"),
    };
    Write("day-diff.tsv",
        "# C# NepDate 2.0.7 day difference, in both directions. D-07: the port's named\n" +
        "# days_until(other) is other - this; the operator keeps C# this - other.\n" +
        "a\tb\tdays_until\toperator_minus\tnote",
        pairs.Select(p =>
        {
            var a = P(p.Item1);
            var b = P(p.Item2);
            var named = (b - a).Days;
            var op = (a - b).Days;
            if (op != a.Subtract(b).Days) throw new InvalidOperationException("Subtract and operator - disagree");
            return $"{Bs(a)}\t{Bs(b)}\t{named}\t{op}\tD-07";
        }));
}

// ---- ymd-int.tsv (NC09; D-11) ---------------------------------------------
{
    var converter = new NepaliDateTypeConverter();
    var rows = new List<string>();
    foreach (var text in new[] { "1901-01-01", "2081-04-15", "2081-04-32", "2199-12-30" })
    {
        var date = P(text);
        var ymd = (int)converter.ConvertTo(null, CultureInfo.InvariantCulture, date, typeof(int))!;
        var roundTrip = (NepaliDate)converter.ConvertFrom(null, CultureInfo.InvariantCulture, ymd)!;
        rows.Add($"date\t{Bs(date)}\t{ymd}\t{Bs(roundTrip)}\tD-11");
    }
    foreach (var value in new[] { 0, 2081, 20810400, 20810015, 20810432, 20810433, 19010101, 21991231, 99999999, -1 })
    {
        var result = Try(() => Bs((NepaliDate)converter.ConvertFrom(null, CultureInfo.InvariantCulture, value)!));
        rows.Add($"int\t-\t{value}\t{result}\tD-11");
    }
    Write("ymd-int.tsv",
        "# C# NepaliDateTypeConverter (NC09), both directions. D-11 keeps the YYYYMMDD integer\n" +
        "# form and drops the converter type. A negative integer is read with C# truncating division.\n" +
        "kind\tinput\tymd\tresult\tnote",
        rows);
}

// ---- bulk.tsv (NC04-NC08) --------------------------------------------------
// C# calls the PLINQ path above 500 items, and that path does not promise order. The generator
// checks a 1200-item call as a multiset, then writes the input-ordered result the ports return.
{
    var english = new[]
    {
        new DateTime(1844, 4, 11), new DateTime(2024, 7, 31), new DateTime(2143, 4, 15),
        new DateTime(2000, 1, 1), new DateTime(2025, 4, 14),
    };
    var nepaliStrings = new[] { "2081-04-15", "1901-01-01", "2199-12-30", "2081-04-32", "2082-01-01" };
    var nepaliDates = nepaliStrings.Select(P).ToArray();

    var bigEnglish = Enumerable.Range(0, 1200).Select(i => new DateTime(2000, 1, 1).AddDays(i)).ToArray();
    var bigBulk = NepaliDate.BulkConvert.ToNepaliDates(bigEnglish).Select(Bs).ToList();
    var bigSingle = bigEnglish.Select(d => Bs(new NepaliDate(d))).ToList();
    if (bigBulk.Count != bigSingle.Count ||
        !bigBulk.OrderBy(x => x, StringComparer.Ordinal).SequenceEqual(bigSingle.OrderBy(x => x, StringComparer.Ordinal)))
        throw new InvalidOperationException("the parallel bulk result is not the same multiset");

    static string EnglishList(IEnumerable<DateTime> items) => string.Join(";", items.Select(d => d.ToString("yyyy-MM-dd")));
    static string NepaliList(IEnumerable<NepaliDate> items) => string.Join(";", items.Select(Bs));

    var rows = new List<string>
    {
        $"to_nepali_dates\t{EnglishList(english)}\t{NepaliList(NepaliDate.BulkConvert.ToNepaliDates(english))}\tinput order",
        $"batch_to_nepali_dates\t{EnglishList(english)}\t{NepaliList(NepaliDate.BulkConvert.BatchProcessToNepaliDates(english, 2))}\tinput order",
        $"to_english_dates_from_strings\t{string.Join(";", nepaliStrings)}\t{EnglishList(NepaliDate.BulkConvert.ToEnglishDates(nepaliStrings))}\tinput order",
        $"to_english_dates_from_dates\t{string.Join(";", nepaliStrings)}\t{EnglishList(NepaliDate.BulkConvert.ToEnglishDates(nepaliDates))}\tinput order",
        $"batch_to_english_dates\t{string.Join(";", nepaliStrings)}\t{EnglishList(NepaliDate.BulkConvert.BatchProcessToEnglishDates(nepaliDates, 2))}\tinput order",
        $"to_english_dates_from_strings\t2081-04-15;2081-01-32\t{Try(() => EnglishList(NepaliDate.BulkConvert.ToEnglishDates(new[] { "2081-04-15", "2081-01-32" })))}\tone bad input",
    };
    Write("bulk.tsv",
        "# C# BulkConvert (NC04-NC08). Above 500 inputs C# uses PLINQ and does not promise order.\n" +
        "# The generator compares that parallel result as a multiset with the per-element\n" +
        "# conversions, then writes the per-element result in input order, which is what every\n" +
        "# port returns. The last row is ERR because the whole call fails on one bad string.\n" +
        "operation\tinput\toutput\tnote",
        rows);
}

// ---- serialization.tsv (NC10; D-01, D-11) ---------------------------------
{
    var options = new JsonSerializerOptions();
    options.Converters.Add(new SystemTextJsonConverters.NepaliDateJsonConverter());

    string JsonWrite(NepaliDate d) => JsonSerializer.Serialize(d, options);
    string JsonRead(string json) => Try(() => Bs(JsonSerializer.Deserialize<NepaliDate>(json, options)));

    var rows = new List<string>();
    foreach (var text in new[] { "1901-01-01", "2081-04-15", "2199-12-30" })
    {
        var date = P(text);
        var json = JsonWrite(date);
        rows.Add($"write\t{Bs(date)}\t{json}\t-\tD-11");
        rows.Add($"read\t{json}\t-\t{JsonRead(json)}\tD-11");
        rows.Add($"roundtrip\t{Bs(date)}\t{json}\t{JsonRead(json)}\tD-11");
    }
    if (JsonRead("null") != "0000-00-00") throw new InvalidOperationException("a null JSON value should be the C# default");
    rows.Add("read\tnull\t-\tERR\tD-01");
    rows.Add($"read\t\"2081-01-32\"\t-\t{JsonRead("\"2081-01-32\"")}\tD-11");
    Write("serialization.tsv",
        "# C# System.Text.Json converter (NC10). D-11 keeps only the native string hook and the\n" +
        "# canonical YYYY-MM-DD text; D-01 means a null JSON value has no port representation, so\n" +
        "# the port hook rejects it instead of producing C#'s 0000-00-00 default. The json field is\n" +
        "# literal JSON text, quotes included: read the file with a TSV reader that does not treat\n" +
        "# quotes as quoting characters.\n" +
        "kind\tinput\tjson\tresult\tnote",
        rows);
}

// ---- format-matrix.tsv (NF02, NF07; D-15) ---------------------------------
{
    var orders = new (string Name, DateFormats Value)[]
    {
        ("Ymd", DateFormats.YearMonthDay), ("Ydm", DateFormats.YearDayMonth),
        ("Myd", DateFormats.MonthYearDay), ("Mdy", DateFormats.MonthDayYear),
        ("Dym", DateFormats.DayYearMonth), ("Dmy", DateFormats.DayMonthYear),
    };
    var separators = new (string Name, Separators Value)[]
    {
        ("Slash", Separators.ForwardSlash), ("Backslash", Separators.BackwardSlash),
        ("Dot", Separators.Dot), ("Underscore", Separators.Underscore),
        ("Dash", Separators.Dash), ("Space", Separators.Space),
    };
    var rows = new List<string>();
    foreach (var order in orders)
        foreach (var separator in separators)
            foreach (var pad in new[] { true, false })
                rows.Add($"short\t2081-04-15\t{order.Name}\t{separator.Name}\t{BoolText(pad)}\ten\t-\t-\t{P("2081-04-15").ToString(order.Value, separator.Value, pad)}\t-");
    foreach (var text in new[] { "1901-01-01", "2199-12-30" })
        foreach (var pad in new[] { true, false })
            rows.Add($"short\t{text}\tYmd\tSlash\t{BoolText(pad)}\ten\t-\t-\t{P(text).ToString(DateFormats.YearMonthDay, Separators.ForwardSlash, pad)}\t-");
    foreach (var order in orders)
        foreach (var text in new[] { "1901-01-01", "2081-04-15", "2199-12-30" })
            rows.Add($"short\t{text}\t{order.Name}\tSlash\ttrue\tne\t-\t-\t{P(text).ToUnicodeString(order.Value, Separators.ForwardSlash, true)}\tD-15");

    void BufferRow(string text, string format, int capacity)
    {
        var date = P(text);
        var span = new char[capacity];
        ReadOnlySpan<char> spec = format == "default" ? default : format.AsSpan();
        var ok = ((ISpanFormattable)date).TryFormat(span, out var written, spec, null);
        var result = ok ? new string(span, 0, written) : "ERR";
        rows.Add($"try_format\t{text}\t-\t-\t-\ten\t{format}\t{capacity}\t{result}\t-");
    }
    BufferRow("2081-04-15", "default", 5);
    BufferRow("2081-04-15", "default", 9);
    BufferRow("2081-04-15", "default", 10);
    BufferRow("2081-04-15", "default", 11);
    BufferRow("2081-04-15", "yyyy-MM-dd", 9);
    BufferRow("2081-04-15", "yyyy-MM-dd", 10);
    BufferRow("2081-04-15", "MMMM d, yyyy", 15);
    BufferRow("2081-04-15", "MMMM d, yyyy", 16);
    Write("format-matrix.tsv",
        "# C# ToString(DateFormats, Separators, leadingZeros) for every order and separator (NF02)\n" +
        "# and ISpanFormattable.TryFormat (NF07). D-15 adds the Nepali-language rows; the digits are\n" +
        "# the C# ToUnicodeString output. try_format writes ERR when the buffer is too small.\n" +
        "kind\tbs\torder\tseparator\tpad\tlang\tformat\tcapacity\tresult\tnote",
        rows);
}

// ---- ranges.tsv (NR01-NR04, NR06, NR15-NR21, NR27, NR30; D-01, D-16) ------
{
    var rows = new List<string>();
    void Construct(string start, string end)
    {
        try
        {
            var range = new NepaliDateRange(P(start), P(end));
            rows.Add(range.IsEmpty
                ? $"{start}\t{end}\tconstruct\t-\tERR\tD-01"
                : $"{start}\t{end}\tconstruct\t-\t{Range(range)}\t-");
        }
        catch
        {
            rows.Add($"{start}\t{end}\tconstruct\t-\tERR\t-");
        }
    }
    void Row(string start, string end, string operation, string argument, Func<NepaliDateRange, string> result, string note = "-")
    {
        var range = new NepaliDateRange(P(start), P(end));
        rows.Add($"{start}\t{end}\t{operation}\t{argument}\t{Try(() => result(range))}\t{note}");
    }
    void RowAtEnd(string start, string end, string operation, string argument,
        Func<NepaliDateRange, string> csharp, string portValue)
    {
        var range = new NepaliDateRange(P(start), P(end));
        ProvesEndError($"{operation} {start}..{end}", () => _ = csharp(range));
        rows.Add($"{start}\t{end}\t{operation}\t{argument}\t{portValue}\tD-16");
    }
    static NepaliDateRange Other(string argument)
    {
        var parts = argument.Split("..");
        return new NepaliDateRange(P(parts[0]), P(parts[1]));
    }

    Construct("2081-04-10", "2081-04-20");
    Construct("2081-04-15", "2081-04-15");
    Construct("2199-12-25", "2199-12-30");
    Construct("2081-04-20", "2081-04-10");
    Construct("2199-12-30", "2200-01-01");
    Construct("1900-12-30", "1901-01-01");

    Row("2081-04-10", "2081-04-20", "length", "-", r => r.Length.ToString());
    Row("2081-04-15", "2081-04-15", "length", "-", r => r.Length.ToString());
    Row("1901-01-01", "1901-01-05", "length", "-", r => r.Length.ToString());
    Row("2199-12-25", "2199-12-30", "length", "-", r => r.Length.ToString());

    foreach (var day in new[] { "2081-04-09", "2081-04-10", "2081-04-15", "2081-04-20", "2081-04-21" })
        Row("2081-04-10", "2081-04-20", "contains_date", day, r => BoolText(r.Contains(P(day))));

    Row("2081-04-10", "2081-04-20", "contains_range", "2081-04-10..2081-04-20", r => BoolText(r.Contains(Other("2081-04-10..2081-04-20"))));
    Row("2081-04-10", "2081-04-20", "contains_range", "2081-04-12..2081-04-18", r => BoolText(r.Contains(Other("2081-04-12..2081-04-18"))));
    Row("2081-04-10", "2081-04-20", "contains_range", "2081-04-15..2081-04-25", r => BoolText(r.Contains(Other("2081-04-15..2081-04-25"))));
    Row("2081-04-10", "2081-04-20", "contains_range", "2081-05-01..2081-05-05", r => BoolText(r.Contains(Other("2081-05-01..2081-05-05"))));

    Row("2081-04-10", "2081-04-20", "overlaps", "2081-04-15..2081-04-25", r => BoolText(r.Overlaps(Other("2081-04-15..2081-04-25"))));
    Row("2081-04-10", "2081-04-20", "overlaps", "2081-04-21..2081-04-25", r => BoolText(r.Overlaps(Other("2081-04-21..2081-04-25"))));
    Row("2081-04-10", "2081-04-20", "overlaps", "2081-05-01..2081-05-05", r => BoolText(r.Overlaps(Other("2081-05-01..2081-05-05"))));
    Row("2081-04-15", "2081-04-25", "overlaps", "2081-04-10..2081-04-20", r => BoolText(r.Overlaps(Other("2081-04-10..2081-04-20"))));

    Row("2081-04-10", "2081-04-20", "is_adjacent_to", "2081-04-21..2081-04-25", r => BoolText(r.IsAdjacentTo(Other("2081-04-21..2081-04-25"))));
    Row("2081-04-21", "2081-04-25", "is_adjacent_to", "2081-04-10..2081-04-20", r => BoolText(r.IsAdjacentTo(Other("2081-04-10..2081-04-20"))));
    Row("2081-04-10", "2081-04-20", "is_adjacent_to", "2081-04-22..2081-04-25", r => BoolText(r.IsAdjacentTo(Other("2081-04-22..2081-04-25"))));
    Row("2081-04-10", "2081-04-20", "is_adjacent_to", "2081-04-15..2081-04-25", r => BoolText(r.IsAdjacentTo(Other("2081-04-15..2081-04-25"))));
    Row("2081-04-10", "2081-04-20", "is_adjacent_to", "2081-04-10..2081-04-20", r => BoolText(r.IsAdjacentTo(Other("2081-04-10..2081-04-20"))));
    RowAtEnd("2199-12-25", "2199-12-30", "is_adjacent_to", "2081-04-10..2081-04-20",
        r => BoolText(r.IsAdjacentTo(Other("2081-04-10..2081-04-20"))), "false");

    Row("2081-04-10", "2081-04-20", "intersect", "2081-04-15..2081-04-25", r => { var i = r.Intersect(Other("2081-04-15..2081-04-25")); return i.IsEmpty ? "none" : Range(i); });
    Row("2081-04-10", "2081-04-20", "intersect", "2081-04-12..2081-04-18", r => { var i = r.Intersect(Other("2081-04-12..2081-04-18")); return i.IsEmpty ? "none" : Range(i); });
    Row("2081-04-10", "2081-04-20", "intersect", "2081-04-10..2081-04-20", r => { var i = r.Intersect(Other("2081-04-10..2081-04-20")); return i.IsEmpty ? "none" : Range(i); });
    Row("2081-04-10", "2081-04-20", "intersect", "2081-04-21..2081-04-25", r => { var i = r.Intersect(Other("2081-04-21..2081-04-25")); return i.IsEmpty ? "none" : Range(i); }, "D-01");
    Row("2081-04-10", "2081-04-20", "intersect", "2081-05-01..2081-05-05", r => { var i = r.Intersect(Other("2081-05-01..2081-05-05")); return i.IsEmpty ? "none" : Range(i); }, "D-01");
    RowAtEnd("1901-01-01", "1901-01-05", "intersect", "2081-04-10..2081-04-20",
        r => { var i = r.Intersect(Other("2081-04-10..2081-04-20")); return i.IsEmpty ? "none" : Range(i); }, "none");

    Row("2081-04-10", "2081-04-20", "union", "2081-04-15..2081-04-25", r => Range(r.Union(Other("2081-04-15..2081-04-25"))));
    Row("2081-04-10", "2081-04-20", "union", "2081-04-21..2081-04-25", r => Range(r.Union(Other("2081-04-21..2081-04-25"))));
    Row("2081-04-10", "2081-04-20", "union", "2081-05-01..2081-05-05", r => Range(r.Union(Other("2081-05-01..2081-05-05"))));
    Row("2081-04-15", "2081-04-25", "union", "2081-04-10..2081-04-20", r => Range(r.Union(Other("2081-04-10..2081-04-20"))));

    Row("2081-04-10", "2081-04-20", "except", "2081-04-13..2081-04-17", r => RangeList(r.Except(Other("2081-04-13..2081-04-17"))));
    Row("2081-04-10", "2081-04-20", "except", "2081-04-10..2081-04-12", r => RangeList(r.Except(Other("2081-04-10..2081-04-12"))));
    Row("2081-04-10", "2081-04-20", "except", "2081-04-18..2081-04-20", r => RangeList(r.Except(Other("2081-04-18..2081-04-20"))));
    Row("2081-04-10", "2081-04-20", "except", "2081-04-01..2081-04-30", r => RangeList(r.Except(Other("2081-04-01..2081-04-30"))));
    Row("2081-04-10", "2081-04-20", "except", "2081-05-01..2081-05-05", r => RangeList(r.Except(Other("2081-05-01..2081-05-05"))));
    Row("2081-04-10", "2081-04-20", "except", "2081-04-15..2081-04-25", r => RangeList(r.Except(Other("2081-04-15..2081-04-25"))));

    Row("2081-04-10", "2081-04-20", "equals", "2081-04-10..2081-04-20", r => BoolText(r.Equals(Other("2081-04-10..2081-04-20"))));
    Row("2081-04-10", "2081-04-20", "equals", "2081-04-10..2081-04-21", r => BoolText(r.Equals(Other("2081-04-10..2081-04-21"))));
    Row("2081-04-10", "2081-04-20", "equals", "2081-04-12..2081-04-18", r => BoolText(r.Equals(Other("2081-04-12..2081-04-18"))));

    Row("2081-04-10", "2081-04-20", "to_string", "-", r => r.ToString());
    Row("2081-04-15", "2081-04-15", "to_string", "-", r => r.ToString());
    Row("2199-12-25", "2199-12-30", "to_string", "-", r => r.ToString());

    Row("2081-04-10", "2081-04-12", "enumerate", "-", r => DateList(r));
    Row("2081-04-15", "2081-04-15", "enumerate", "-", r => DateList(r));
    Row("1901-01-01", "1901-01-03", "enumerate", "-", r => DateList(r));
    Write("ranges.tsv",
        "# C# NepDateRange (NR01-NR04, NR06, NR15-NR21, NR27, NR30). Ranges are inclusive.\n" +
        "# D-01: a port has no empty range, so start > end is ERR and Intersect with no overlap is\n" +
        "# none; C# returns an empty range for both.\n" +
        "# D-16: C# also throws ArgumentOutOfRangeException at the data end. IsAdjacentTo throws\n" +
        "# when a range ends at 2199-12-30, and Intersect of disjoint ranges throws when the\n" +
        "# receiver starts at 1901-01-01; those rows hold the port's value.\n" +
        "start\tend\toperation\targument\tresult\tnote",
        rows);
}

// ---- range-factories.tsv (NR07-NR11) --------------------------------------
{
    var rows = new List<string>();
    void Factory(string factory, string argument, Func<string> result, string note = "-")
        => rows.Add($"{factory}\t{argument}\t{Try(result)}\t{note}");

    Factory("single_day", "2081-04-15", () => Range(NepaliDateRange.SingleDay(P("2081-04-15"))));
    Factory("single_day", "1901-01-01", () => Range(NepaliDateRange.SingleDay(P("1901-01-01"))));
    Factory("single_day", "2199-12-30", () => Range(NepaliDateRange.SingleDay(P("2199-12-30"))));
    Factory("single_day", "2081-13-01", () => Range(NepaliDateRange.SingleDay(P("2081-13-01"))));

    Factory("from_day_count", "2081-04-15,1", () => Range(NepaliDateRange.FromDayCount(P("2081-04-15"), 1)));
    Factory("from_day_count", "2081-04-15,5", () => Range(NepaliDateRange.FromDayCount(P("2081-04-15"), 5)));
    Factory("from_day_count", "2081-04-15,0", () => Range(NepaliDateRange.FromDayCount(P("2081-04-15"), 0)));
    Factory("from_day_count", "2081-04-15,-1", () => Range(NepaliDateRange.FromDayCount(P("2081-04-15"), -1)));
    Factory("from_day_count", "2199-12-30,2", () => Range(NepaliDateRange.FromDayCount(P("2199-12-30"), 2)));
    Factory("from_day_count", "2081-04-15,109212", () => Range(NepaliDateRange.FromDayCount(P("2081-04-15"), 109212)));

    Factory("for_month", "1901,1", () => Range(NepaliDateRange.ForMonth(1901, 1)));
    Factory("for_month", "2081,4", () => Range(NepaliDateRange.ForMonth(2081, 4)));
    Factory("for_month", "2199,12", () => Range(NepaliDateRange.ForMonth(2199, 12)));
    Factory("for_month", "2081,13", () => Range(NepaliDateRange.ForMonth(2081, 13)));
    Factory("for_month", "1900,1", () => Range(NepaliDateRange.ForMonth(1900, 1)));

    Factory("for_calendar_year", "1901", () => Range(NepaliDateRange.ForCalendarYear(1901)));
    Factory("for_calendar_year", "2081", () => Range(NepaliDateRange.ForCalendarYear(2081)));
    Factory("for_calendar_year", "2199", () => Range(NepaliDateRange.ForCalendarYear(2199)));
    Factory("for_calendar_year", "1900", () => Range(NepaliDateRange.ForCalendarYear(1900)));
    Factory("for_calendar_year", "2200", () => Range(NepaliDateRange.ForCalendarYear(2200)));

    Factory("for_fiscal_year", "1901", () => Range(NepaliDateRange.ForFiscalYear(1901)));
    Factory("for_fiscal_year", "2080", () => Range(NepaliDateRange.ForFiscalYear(2080)));
    Factory("for_fiscal_year", "2081", () => Range(NepaliDateRange.ForFiscalYear(2081)));
    Factory("for_fiscal_year", "2199", () => Range(NepaliDateRange.ForFiscalYear(2199)));
    Factory("for_fiscal_year", "1900", () => Range(NepaliDateRange.ForFiscalYear(1900)));

    Factory("construct", "2081-04-15,2081-04-20", () => Range(new NepaliDateRange(P("2081-04-15"), P("2081-04-20"))));
    Factory("construct", "2081-04-20,2081-04-10", () => "ERR", "D-01");
    Write("range-factories.tsv",
        "# C# NepaliDateRange factories (NR07-NR11). D-01: a port refuses start > end, so the\n" +
        "# construct row that C# accepts as an empty range is ERR here.\n" +
        "factory\targument\tresult\tnote",
        rows);
}

// ---- range-splits.tsv (NR22, NR23; D-16) ----------------------------------
{
    var rows = new List<string>();
    void Split(string start, string end, string operation, Func<NepaliDateRange, IEnumerable<NepaliDateRange>> split, string note = "-")
    {
        var range = new NepaliDateRange(P(start), P(end));
        rows.Add($"{start}\t{end}\t{operation}\t{Try(() => RangeList(split(range)))}\t{note}");
    }
    void SplitAtEnd(string start, string end, string operation,
        Func<NepaliDateRange, IEnumerable<NepaliDateRange>> csharp,
        Func<NepaliDate, NepaliDate, IEnumerable<NepaliDateRange>> port)
    {
        var a = P(start);
        var b = P(end);
        ProvesEndError($"{operation} {start}..{end}", () => csharp(new NepaliDateRange(a, b)).ToArray());
        rows.Add($"{start}\t{end}\t{operation}\t{RangeList(port(a, b))}\tD-16");
    }
    Split("2081-04-15", "2081-04-15", "split_by_month", r => r.SplitByMonth());
    Split("2081-04-30", "2081-06-02", "split_by_month", r => r.SplitByMonth());
    Split("2081-01-01", "2081-12-31", "split_by_month", r => r.SplitByMonth());
    SplitAtEnd("2199-11-30", "2199-12-30", "split_by_month", r => r.SplitByMonth(), SplitByMonthUntil);
    Split("2081-03-30", "2081-07-02", "split_by_fiscal_quarter", r => r.SplitByFiscalQuarter());
    Split("2081-01-01", "2081-03-30", "split_by_fiscal_quarter", r => r.SplitByFiscalQuarter());
    Split("2080-10-01", "2081-01-31", "split_by_fiscal_quarter", r => r.SplitByFiscalQuarter());
    Split("2081-04-01", "2081-06-30", "split_by_fiscal_quarter", r => r.SplitByFiscalQuarter());
    SplitAtEnd("2199-12-25", "2199-12-30", "split_by_fiscal_quarter", r => r.SplitByFiscalQuarter(), SplitByFiscalQuarterUntil);
    Write("range-splits.tsv",
        "# C# NepaliDateRange.SplitByMonth and SplitByFiscalQuarter (NR22, NR23). The first and\n" +
        "# last piece are clipped to the range ends; a piece is written start..end. C# advances to\n" +
        "# the next month or quarter after the last piece and throws\n" +
        "# ArgumentOutOfRangeException when that would pass 2199-12-30. The D-16 rows hold the\n" +
        "# port's value: every piece, the last one ending at the range end.\n" +
        "start\tend\toperation\tresult\tnote",
        rows);
}

// ---- range-days.tsv (NR24-NR27; D-16) --------------------------------------
{
    var rows = new List<string>();
    void Days(string start, string end, string operation, string argument,
        Func<NepaliDateRange, IEnumerable<NepaliDate>> result, string note = "-")
    {
        var range = new NepaliDateRange(P(start), P(end));
        rows.Add($"{start}\t{end}\t{operation}\t{argument}\t{Try(() => DateList(result(range)))}\t{note}");
    }
    void DaysAtEnd(string start, string end, string operation, string argument,
        Func<NepaliDateRange, IEnumerable<NepaliDate>> csharp,
        Func<NepaliDate, NepaliDate, IEnumerable<NepaliDate>> port)
    {
        var a = P(start);
        var b = P(end);
        ProvesEndError($"{operation} {start}..{end}", () => csharp(new NepaliDateRange(a, b)).ToArray());
        rows.Add($"{start}\t{end}\t{operation}\t{argument}\t{DateList(port(a, b))}\tD-16");
    }
    Days("2081-04-10", "2081-04-20", "dates_with_interval", "1", r => r.DatesWithInterval(1));
    Days("2081-04-10", "2081-04-20", "dates_with_interval", "3", r => r.DatesWithInterval(3));
    Days("2081-04-10", "2081-04-20", "dates_with_interval", "11", r => r.DatesWithInterval(11));
    Days("2081-04-10", "2081-04-20", "dates_with_interval", "0", r => r.DatesWithInterval(0));
    Days("2081-04-10", "2081-04-20", "dates_with_interval", "-1", r => r.DatesWithInterval(-1));
    Days("2081-04-13", "2081-04-21", "working_days", "false", r => r.WorkingDays());
    Days("2081-04-13", "2081-04-21", "working_days", "true", r => r.WorkingDays(true));
    Days("2081-04-13", "2081-04-21", "weekend_days", "true", r => r.WeekendDays());
    Days("2081-04-13", "2081-04-21", "weekend_days", "false", r => r.WeekendDays(false));
    Days("2081-04-15", "2081-04-15", "working_days", "false", r => r.WorkingDays());
    Days("2081-04-15", "2081-04-15", "weekend_days", "true", r => r.WeekendDays());
    DaysAtEnd("2199-12-25", "2199-12-30", "working_days", "false", r => r.WorkingDays(), (a, b) => WorkingDaysUntil(a, b, false));
    Days("2081-04-10", "2081-04-12", "enumerate", "-", r => r);
    Days("1901-01-01", "1901-01-03", "enumerate", "-", r => r);
    DaysAtEnd("2199-12-30", "2199-12-30", "enumerate", "-", r => r, (a, b) => EveryDayUntil(a, b));
    DaysAtEnd("2199-12-30", "2199-12-30", "working_days", "false", r => r.WorkingDays(), (a, b) => WorkingDaysUntil(a, b, false));
    DaysAtEnd("2199-12-30", "2199-12-30", "weekend_days", "true", r => r.WeekendDays(), (a, b) => WeekendDaysUntil(a, b, true));
    DaysAtEnd("2199-12-30", "2199-12-30", "dates_with_interval", "1", r => r.DatesWithInterval(1), (a, b) => IntervalDaysUntil(a, b, 1));
    Write("range-days.tsv",
        "# C# NepaliDateRange day helpers (NR24-NR27). Every list is in date order; none is an\n" +
        "# empty result and ERR is a rejected argument (interval below 1). C# also advances one\n" +
        "# day after the last item and throws ArgumentOutOfRangeException at 2199-12-30. The D-16\n" +
        "# rows hold the port's value: every date up to and including 2199-12-30.\n" +
        "start\tend\toperation\targument\tresult\tnote",
        rows);
}

// ---- range-format.tsv (NR28, NR29; D-01, D-15) -----------------------------
{
    var rows = new List<string>();
    void Format(string start, string end, string kind, string order, string separator, string lang,
        Func<NepaliDateRange, string> result, string note = "-")
    {
        var range = new NepaliDateRange(P(start), P(end));
        var text = range.IsEmpty ? "ERR" : Try(() => result(range));
        rows.Add($"{start}\t{end}\t{kind}\t{order}\t{separator}\t{lang}\t{text}\t{note}");
    }
    var orders = new (string Name, DateFormats Value)[]
    {
        ("Ymd", DateFormats.YearMonthDay), ("Ydm", DateFormats.YearDayMonth),
        ("Myd", DateFormats.MonthYearDay), ("Mdy", DateFormats.MonthDayYear),
        ("Dym", DateFormats.DayYearMonth), ("Dmy", DateFormats.DayMonthYear),
    };
    var separators = new (string Name, Separators Value)[]
    {
        ("Slash", Separators.ForwardSlash), ("Dash", Separators.Dash), ("Space", Separators.Space),
    };

    Format("2081-04-10", "2081-04-20", "default", "-", "-", "en", r => r.ToString());
    Format("2081-04-15", "2081-04-15", "default", "-", "-", "en", r => r.ToString());
    Format("2199-12-25", "2199-12-30", "default", "-", "-", "en", r => r.ToString());

    foreach (var order in orders)
        Format("2081-04-10", "2081-04-20", "short", order.Name, "Dash", "en",
            r => r.ToString(order.Value, Separators.Dash));
    foreach (var separator in separators)
        if (separator.Name != "Dash")
            Format("2081-04-10", "2081-04-20", "short", "Dmy", separator.Name, "en",
                r => r.ToString(DateFormats.DayMonthYear, separator.Value));
    foreach (var order in orders)
        Format("2081-04-10", "2081-04-20", "short", order.Name, "Slash", "ne",
            r => r.Start.ToUnicodeString(order.Value, Separators.ForwardSlash) + " - " +
                 r.End.ToUnicodeString(order.Value, Separators.ForwardSlash), "D-15");

    Format("2081-04-20", "2081-04-10", "default", "-", "-", "en", r => r.ToString(), "D-01");
    Write("range-format.tsv",
        "# C# NepaliDateRange string forms (NR28, NR29). D-01: a port cannot build the C# empty\n" +
        "# range, so that row is ERR instead of \"Empty Range\". D-15 adds the Nepali-language rows.\n" +
        "start\tend\tkind\torder\tseparator\tlang\tresult\tnote",
        rows);
}

Console.WriteLine($"wrote {dates.Count} dates to {outDir}");

void Write(string name, string header, IEnumerable<string> rows)
{
    var sb = new StringBuilder(header).Append('\n');
    foreach (var r in rows) sb.Append(r).Append('\n');
    File.WriteAllText(Path.Combine(outDir, name), sb.ToString(), new UTF8Encoding(false));
}
