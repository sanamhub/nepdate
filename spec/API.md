# The NepDate API: canonical inventory (v1)

This file lists the public API of the C# NepDate package and what every port must offer. It is
the inventory the ports work from when they close the gaps in `docs/API.md`. It is not a second
behaviour spec: `ALGORITHM.md`, `FORMATTING.md`, `PARSING.md` and `PATRO.md` stay normative.

The oracle is the C# code in `src/NepDate` at `origin/main`, not the C# README or the XML
comments. `PARITY.md` explains why. Where a comment disagrees with the code, this file follows
the code and names the disagreement.

## How to read this file

- A row is one public type or member of the C# package. Constructors, properties, methods,
  operators, enum values as a group, and extension methods all count.
- `D-01` to `D-15` refer to `PARITY.md`. A row with a D number is a deliberate, agreed
  deviation, not a gap.
- `open O-nn` refers to the decisions at the end. The owner decides those before the ports
  change.
- Vectors are in `spec/vectors`. `dates.tsv` has 1018 rows, `add-days.tsv` 9162,
  `add-months.tsv` 10180, `format-pattern.tsv` 451, `csharp-golden/parse.tsv` 42, and
  `parse.tsv` 69. `month-boundaries.csv` has 7176 data rows. `ERR` in a vector means the C#
  call threw or returned false.
- A naming table gives the name and signature this audit proposes. Existing names are kept
  where they already fit the language. A proposed name is not a decision until the owner
  accepts it.

## Groups and counts

| Group | Prefix | Rows |
|---|---|---:|
| Dates, identity and comparison | ND | 34 |
| Conversion and serialization | NC | 16 |
| Arithmetic | NA | 5 |
| Formatting | NF | 10 |
| Parsing | NP | 9 |
| Ranges | NR | 30 |
| Fiscal year | NY | 13 |
| Patro | NT | 7 |
| **Total** | | **124** |

## 1. Dates, identity and comparison

| ID | C# signature | What the code does |
|---|---|---|
| ND01 | `NepaliDate(int yearBs, int monthBs, int dayBs)` | Builds a BS date and validates year, then month, then day. |
| ND02 | `NepaliDate(string rawNepaliDate)` | Parses three numeric groups in year, month, day order with the accepted separators. |
| ND03 | `NepaliDate(string rawNepaliDate, bool autoAdjust, bool monthInMiddle = true)` | Parses, then applies the three heuristics: oversized day swaps with year, `monthInMiddle: false` swaps month and day, month over 12 and day under 13 swaps, a year under 1000 gets 2000 added. |
| ND04 | `NepaliDate(DateTime engDate)` | Converts the date part of a Gregorian `DateTime`; rejects dates outside the supported AD span. |
| ND05 | `bool IsDefault { get; }` | True only when year, month and day are all zero. |
| ND06 | `int Year { get; }` | BS year, 1901 to 2199. |
| ND07 | `int Month { get; }` | Month number, 1 to 12. |
| ND08 | `int Day { get; }` | Day of month, 1 to the month length. |
| ND09 | `DateTime EnglishDate { get; }` | Gregorian `DateTime` at midnight; throws on a default value. |
| ND10 | `DayOfWeek DayOfWeek { get; }` | Weekday of the Gregorian date, Sunday is 0. |
| ND11 | `int DayOfYear { get; }` | 1-based ordinal in the BS year, not the Gregorian year. |
| ND12 | `int MonthEndDay { get; }` | Last valid day number of this BS month, 29 to 32. |
| ND13 | `NepaliMonths MonthName { get; }` | Month enum cast from the numeric month. |
| ND14 | `static NepaliDate Today { get; }` | Today in the machine's local time zone. |
| ND15 | `static NepaliDate Now { get; }` | Same date as `Today`; the time of day is discarded. |
| ND16 | `static readonly NepaliDate MinValue` | 1901-01-01 BS, AD 1844-04-11. |
| ND17 | `static readonly NepaliDate MaxValue` | 2199-12-30 BS, AD 2143-04-15. |
| ND18 | `NepaliDate MonthEndDate()` | This year and month on the last day. |
| ND19 | `void Deconstruct(out int year, out int month, out int day)` | Tuple deconstruction of the three components. |
| ND20 | `bool IsLeapYear()` | Gregorian leap year of `EnglishDate.Year`, not a BS year property. |
| ND21 | `bool IsToday()` | `DateTime.Today.ToNepaliDate() == this`. |
| ND22 | `bool IsYesterday()` | `DateTime.Today.AddDays(-1).ToNepaliDate() == this`. |
| ND23 | `bool IsTomorrow()` | `DateTime.Today.AddDays(1).ToNepaliDate() == this`. |
| ND24 | `int CompareTo(NepaliDate obj)` | Compares the packed `YYYYMMDD` integer. |
| ND25 | `int CompareTo(object obj)` | Null sorts before any date; another type throws `ArgumentException`. |
| ND26 | `bool Equals(NepaliDate other)` | Compares the packed integer. |
| ND27 | `override bool Equals(object obj)` | True only for a `NepaliDate` with the same packed integer. |
| ND28 | `override int GetHashCode()` | Returns the packed `YYYYMMDD` integer. |
| ND29 | `static bool operator ==(NepaliDate, NepaliDate)` | Packed integer equality. |
| ND30 | `static bool operator !=(NepaliDate, NepaliDate)` | Packed integer inequality. |
| ND31 | `static bool operator <(NepaliDate, NepaliDate)` | Packed integer order. |
| ND32 | `static bool operator <=(NepaliDate, NepaliDate)` | Packed integer order. |
| ND33 | `static bool operator >(NepaliDate, NepaliDate)` | Packed integer order. |
| ND34 | `static bool operator >=(NepaliDate, NepaliDate)` | Packed integer order. |

**Required behaviour.** A valid date is 1901-01-01 through 2199-12-30 BS, which is 1844-04-11
through 2143-04-15 AD. Validation reports the first failure in the order year, month, day. The
month length comes from the BS table, not a fixed 30 or 31. `DayOfYear` counts from Baishakh 1
and reaches 365 or 366 on the last day of a normal year. `MinValue` is 1901-01-01 and
`MaxValue` is the last day of Chaitra 2199. These facts are covered by `dates.tsv` columns
`ad`, `weekday`, `day_of_year` and `month_length`, and by the 7176 month boundaries in
`month-boundaries.csv`. Boundary rows: 1901-01-01 is AD 1844-04-11, and 2199-12-30 is AD
2143-04-15.

`IsLeapYear` follows the Gregorian year, so 2080-01-01 (April 2023) is false while 2080-11-01
(January 2024) is true. `D-12` replaces it with the length of the BS year, 364 to 367 days.

`Today` and `Now` read the machine clock. `D-14` removes `Now` and the three relative
predicates from the required port surface and asks for an explicit time zone where a port
offers a today helper.

`IsDefault` exists because a C# struct always has a zero value (`D-01`). Ports that can make
invalid dates unrepresentable do not need it.

**Naming.**

| ID | C# | Rust | Go | TypeScript | Python | Swift | Kotlin | C++ | C |
|---|---|---|---|---|---|---|---|---|---|
| ND01 | `new NepaliDate(y, m, d)` | `NepaliDate::new(y, m, d) -> Result` | `New(y, Month, d) (Date, error)` | `NepaliDate.of(y, m, d)` | `NepaliDate(y, m, d)` | `NepaliDate(year:month:day:) throws` | `NepaliDate.of(y, m, d)` | `make_date(y, month, d) -> result<date>` | `nepdate_from_bs(y, m, d, &out)` |
| ND02 | `new NepaliDate(string)` | `str::parse::<NepaliDate>()` (`FromStr`) | `Parse(s) (Date, error)` | `NepaliDate.parse(s)` | `NepaliDate.parse(s)` | `NepaliDate.parse(_:) throws` | `NepaliDate.parse(text)` | `parse(string_view) -> result<date>` | `nepdate_parse(text, len, &out)` |
| ND03 | `new NepaliDate(string, autoAdjust, monthInMiddle)` | none (`D-06`) | none (`D-06`) | none (`D-06`) | none (`D-06`) | none (`D-06`) | none (`D-06`) | none (`D-06`) | none (`D-06`) |
| ND04 | `new NepaliDate(DateTime)` | `NepaliDate::from_gregorian(y, m, d)` | `FromGregorian(y, time.Month, d)` | `NepaliDate.fromGregorian({year, month, day})` | `NepaliDate.from_date(date)` | `NepaliDate(gregorianYear:month:day:)` | `NepaliDate.ofGregorian(y, m, d)` | `from_gregorian(y, m, d)` | `nepdate_from_ad(y, m, d, &out)` |
| ND05 | `IsDefault` | none (`D-01`) | `IsZero()` | none (`D-01`) | none (`D-01`) | none (`D-01`) | none (`D-01`) | none (`D-01`) | invalid sentinel (`D-01`) |
| ND06 | `Year` | `year() -> u16` | `Year() int` | `year: number` | `year: int` | `year: Int` | `year: Int` | `year() -> int` | `nepdate_to_bs(...).year` |
| ND07 | `Month` | `month() -> Month`, `month_number() -> u8` | `Month() Month` | `month: number` | `month: int` | `month: Int` | `monthValue: Int`, `month: Month` | `month() -> month` | `nepdate_month_of(...)` |
| ND08 | `Day` | `day() -> u8` | `Day() int` | `day: number` | `day: int` | `day: Int` | `dayOfMonth: Int` | `day() -> int` | `nepdate_to_bs(...).day` |
| ND09 | `EnglishDate` | `to_gregorian() -> GregorianDate` | `Gregorian() (int, time.Month, int)` | `toGregorian(): GregorianDate` | `to_date() -> datetime.date` | `gregorian: (year, month, day)` | `gregorianYear`, `gregorianMonth`, `gregorianDay` | `to_year_month_day()`, `to_sys_days()` | `nepdate_to_ad(date, &out)` |
| ND10 | `DayOfWeek` | `weekday() -> Weekday` | `Weekday() time.Weekday` | `weekday: number` | `weekday: Weekday` | `weekday: Weekday` | `dayOfWeek: Weekday` | `weekday() -> std::chrono::weekday` | `nepdate_weekday_of(date, &out)` |
| ND11 | `DayOfYear` | `day_of_year() -> u16` | `YearDay() int` | `dayOfYear: number` | `day_of_year: int` | `dayOfYear: Int` | `dayOfYear: Int` | `day_of_year() -> int` | `nepdate_day_of_year(date, &out)` |
| ND12 | `MonthEndDay` | `month_length() -> u8` | `MonthLength() int` | `monthLength: number` | `month_length: int` | `monthLength: Int` | `lengthOfMonth(): Int` | `month_length() -> int` | `nepdate_month_length(date, &out)` |
| ND13 | `MonthName` | `month() -> Month` | `Month() Month` | `monthName(m)` function | `month_enum: Month` | `bsMonth: Month` | `month: Month` | `month() -> month` | `nepdate_month_of(date, &out)` |
| ND14 | `Today` | `today()` with `jiff` | `Today(loc *time.Location)` | `NepaliDate.today(zone?)` | `NepaliDate.today(tz=None)` | `NepaliDate.today(in:)` | `nepaliToday(zone?)` | `today(offset)` | `nepdate_today_nepal(unix)` |
| ND15 | `Now` | none (`open O-02`) | none (`open O-02`) | none (`open O-02`) | none (`open O-02`) | none (`open O-02`) | none (`open O-02`) | none (`open O-02`) | none (`open O-02`) |
| ND16 | `MinValue` | `MIN` | `Min` | `NepaliDate.MIN` | `MIN` | `NepaliDate.min` | `NepaliDate.MIN` | `date::min()` | none (`open O-17`) |
| ND17 | `MaxValue` | `MAX` | `Max` | `NepaliDate.MAX` | `MAX` | `NepaliDate.max` | `NepaliDate.MAX` | `date::max()` | none (`open O-17`) |
| ND18 | `MonthEndDate()` | `last_day_of_month()` | `LastOfMonth()` | `lastOfMonth()` | `last_of_month()` | `lastDayOfMonth` | `lastDayOfMonth()` | `last_of_month()` | `nepdate_last_day_of_month(date, &out)` |
| ND19 | `Deconstruct` | none | none | none | none | none | none | none | none |
| ND20 | `IsLeapYear()` | none; add `year_length()` (`open O-01`) | none; add `YearLength()` (`open O-01`) | none; add `yearLength` (`open O-01`) | none; add `year_length()` (`open O-01`) | none; add `yearLength` (`open O-01`) | none; add `yearLength()` (`open O-01`) | `year_length()` (`D-12`) | none; add `nepdate_year_length` (`open O-01`) |
| ND21 | `IsToday()` | `is_today()` with `jiff` (`D-14`) | none (`D-14`) | none (`D-14`) | none (`D-14`) | none (`D-14`) | none (`D-14`) | none (`D-14`) | none (`D-14`) |
| ND22 | `IsYesterday()` | none (`D-14`) | none (`D-14`) | none (`D-14`) | none (`D-14`) | none (`D-14`) | none (`D-14`) | none (`D-14`) | none (`D-14`) |
| ND23 | `IsTomorrow()` | none (`D-14`) | none (`D-14`) | none (`D-14`) | none (`D-14`) | none (`D-14`) | none (`D-14`) | none (`D-14`) | none (`D-14`) |
| ND24 | `CompareTo(NepaliDate)` | `Ord::cmp` | `Compare(other) int` | `NepaliDate.compare(a, b)` | ordering dunders | `Comparable` | `Comparable` | `operator<=>` | `nepdate_compare(a, b, &out)` |
| ND25 | `CompareTo(object)` | none | none | none | none | none | none | none | none |
| ND26 | `Equals(NepaliDate)` | `PartialEq` | `==` | `equals(other)` | `__eq__` | `==` | `equals(Any?)` | `operator==` | `nepdate_compare` equals 0 |
| ND27 | `Equals(object)` | none | none | none | `__eq__(object)` (`D`) | none | `equals(Any?)` (`D`) | none | none |
| ND28 | `GetHashCode()` | `Hash` | none | none | `__hash__` | `Hashable` | `hashCode()` | `std::hash` | none |
| ND29 | `operator ==` | `PartialEq::eq` | `==` | `equals` | `__eq__` | `==` | `==` | `operator==` | compare equals 0 |
| ND30 | `operator !=` | `PartialEq::ne` | `!=` | `!equals` | `__ne__` | `!=` | `!=` | `!=` | compare not 0 |
| ND31 | `operator <` | `Ord::cmp` | `Before`/`Compare` | `compare(a, b) < 0` | `__lt__` | `<` | `<` | `operator<` from `<=>` | compare below 0 |
| ND32 | `operator <=` | `Ord::cmp` | `Compare` | `compare(a, b) <= 0` | `__le__` | `<=` | `<=` | `<=` | compare at most 0 |
| ND33 | `operator >` | `Ord::cmp` | `After`/`Compare` | `compare(a, b) > 0` | `__gt__` | `>` | `>` | `>` | compare above 0 |
| ND34 | `operator >=` | `Ord::cmp` | `Compare` | `compare(a, b) >= 0` | `__ge__` | `>=` | `>=` | `>=` | compare at least 0 |

## 2. Conversion and serialization

| ID | C# signature | What the code does |
|---|---|---|
| NC01 | `static NepaliDate DateTimeExtensions.ToNepaliDate(this DateTime englishDate)` | Calls the `DateTime` constructor. |
| NC02 | `static NepaliDate SmartParsingExtensions.ToNepaliDate(this string input)` | Calls `SmartDateParser.Parse`. |
| NC03 | `static bool SmartParsingExtensions.TryToNepaliDate(this string input, out NepaliDate result)` | Calls `SmartDateParser.TryParse`. |
| NC04 | `static IEnumerable<NepaliDate> NepaliDate.BulkConvert.ToNepaliDates(IEnumerable<DateTime> engDates, bool useParallel = true)` | Maps every date; above 500 items and with parallel on it runs PLINQ and materialises a list. |
| NC05 | `static IEnumerable<DateTime> ...ToEnglishDates(IEnumerable<string> nepDates, bool useParallel = true)` | Parses each string and returns its English date. |
| NC06 | `static IEnumerable<DateTime> ...ToEnglishDates(IEnumerable<NepaliDate> nepDates, bool useParallel = true)` | Returns `EnglishDate` for each date. |
| NC07 | `static IEnumerable<NepaliDate> ...BatchProcessToNepaliDates(IEnumerable<DateTime> engDates, int batchSize = 1000)` | Converts in batches and accumulates a list. |
| NC08 | `static IEnumerable<DateTime> ...BatchProcessToEnglishDates(IEnumerable<NepaliDate> nepDates, int batchSize = 1000)` | Converts in batches and accumulates a list. |
| NC09 | `sealed class NepaliDateTypeConverter : TypeConverter` | Converts to and from string, `YYYYMMDD` integer and `DateTime`; `ConvertTo` string is `YYYY-MM-DD`. |
| NC10 | `class SystemTextJsonConverters.NepaliDateJsonConverter : JsonConverter<NepaliDate>` | Reads a string or an object and writes `YYYY-MM-DD`; null becomes the default value. |
| NC11 | `class SystemTextJsonConverters.NepaliDateObjectJsonConverter` | Reads an object and writes `{ "Year", "Month", "Day" }`. |
| NC12 | `class NewtonsoftJsonConverters.NepaliDateJsonConverter : JsonConverter<NepaliDate>` | The Newtonsoft version of NC10. |
| NC13 | `class NewtonsoftJsonConverters.NepaliDateObjectJsonConverter` | The Newtonsoft version of NC11. |
| NC14 | `class NepaliDateXmlSerializer : IXmlSerializable` | Writes `YYYY-MM-DD` text and reads it back. |
| NC15 | `static JsonSerializerOptions SerializationExtensions.ConfigureForNepaliDate(this JsonSerializerOptions options, bool useObjectFormat = false)` | Registers NC10 or NC11. |
| NC16 | `static JsonSerializerSettings SerializationExtensions.ConfigureForNepaliDate(this JsonSerializerSettings settings, bool useObjectFormat = false)` | Registers NC12 or NC13. |

**Required behaviour.** C# accepts only `DateTime`, not `DateOnly`. A port exposes its
platform's Gregorian date type (Go `time.Time`, Python `datetime.date`, Swift `Date` plus a
zone, Kotlin `java.time.LocalDate`, C++ `<chrono>`, TypeScript `Date` or a structural
`{year, month, day}`, Rust `GregorianDate` plus the optional `chrono` and `jiff` conversions,
C `struct tm` and Unix seconds). The date part is what converts; a time of day is discarded.

The bulk methods are convenience. C# materialises the input to choose parallel or sequential
and does not promise input order when parallel. `D-10` does not port them; a port uses its
own map or parallel map.

The string interchange form is `YYYY-MM-DD`. `D-11` keeps that one form and drops the object
form, the Newtonsoft and XML adapters. A port that has a standard serialization protocol may
implement the string form natively, for example Rust `serde` behind a feature, Go
`encoding.TextMarshaler`, Swift `Codable`, or JavaScript `toJSON`.

The `TypeConverter` also converts an integer in `YYYYMMDD` form. Its `ConvertFrom(DateTime)`
returns `Today` when the value is today's AD date and a fresh `NepaliDate` otherwise, which is a
C# convenience with no behavioural value. No port offers the integer conversion today, and
`PARITY.md` has no row for it. That is an open decision (`O-08`).

**Naming.**

| ID | C# | Rust | Go | TypeScript | Python | Swift | Kotlin | C++ | C |
|---|---|---|---|---|---|---|---|---|---|
| NC01 | `DateTime.ToNepaliDate()` | `TryFrom<GregorianDate>` | `FromTime(t)` | `fromGregorian`, `fromJSDate` | `from_date(d)` | `init(_ date: Date, in:)` | `LocalDate.toNepaliDate()` | `from_gregorian`, `from_sys_days` | `nepdate_from_ad`, `nepdate_from_unix` |
| NC02 | `string.ToNepaliDate()` | `parse_lenient` | `ParseLenient` | `parseLenient` | `parse_lenient` | `parseLenient` | `parseLenient` | `parse_lenient` | `nepdate_parse_lenient` |
| NC03 | `string.TryToNepaliDate(out)` | none (`open O-05`) | none (`open O-05`) | `tryParse` | none (`open O-05`) | none (`open O-05`) | `parseOrNull` (strict) | none (`open O-05`) | status return |
| NC04 | `BulkConvert.ToNepaliDates` | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) |
| NC05 | `BulkConvert.ToEnglishDates(strings)` | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) |
| NC06 | `BulkConvert.ToEnglishDates(dates)` | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) |
| NC07 | `BatchProcessToNepaliDates` | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) |
| NC08 | `BatchProcessToEnglishDates` | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) | none (`D-10`) |
| NC09 | `NepaliDateTypeConverter` | none (`open O-08`) | none (`open O-08`) | none (`open O-08`) | none (`open O-08`) | none (`open O-08`) | none (`open O-08`) | none (`open O-08`) | none (`open O-08`) |
| NC10 | STJ string converter | `serde` string (`D-11`) | `MarshalText` (`D-11`) | `toJSON` (`D-11`) | none (`open O-07`) | `Codable` string (`D-11`) | none (`open O-07`) | none (`open O-07`) | none (`open O-07`) |
| NC11 | STJ object converter | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) |
| NC12 | Newtonsoft string converter | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) |
| NC13 | Newtonsoft object converter | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) |
| NC14 | XML serializer | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) |
| NC15 | `ConfigureForNepaliDate` STJ | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) |
| NC16 | `ConfigureForNepaliDate` Newtonsoft | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) | none (`D-11`) |

## 3. Arithmetic

| ID | C# signature | What the code does |
|---|---|---|
| NA01 | `NepaliDate AddMonths(double months, bool awayFromMonthEnd = false)` | Negative values delegate to subtraction. A fractional value is rounded away from zero and converted to days at 30.4167 days per month. A whole value moves in month space and clamps or spills at the target month end. |
| NA02 | `NepaliDate AddDays(double days)` | Converts to `DateTime`, calls `DateTime.AddDays`, converts back; only the date part survives. |
| NA03 | `NepaliDate AddYears(int years, bool awayFromMonthEnd = false)` | `AddMonths(years * 12.0, awayFromMonthEnd)`. |
| NA04 | `TimeSpan Subtract(NepaliDate nepDateTo)` | `this - nepDateTo`; positive when this date is later. |
| NA05 | `static TimeSpan operator -(NepaliDate d1, NepaliDate d2)` | English date difference; positive when `d1` is later. |

**Required behaviour.** Whole month arithmetic is the required model. `D-02` removes
fractional months and makes the overflow choice explicit: clamp to the last day of the target
month, or spill the excess into the following month. `D-03` removes fractional days. The
vectors `add-months.tsv` (10180 rows) and `add-days.tsv` (9162 rows) cover both choices and
the range boundaries. Examples from `ALGORITHM.md`: 2081-04-32 plus two months is
2081-06-30 with clamp and 2081-07-02 with spill; 2080-01-01 to 2081-04-15 is 473 days.

`D-07` replaces `TimeSpan` with a signed integer day count. The ports implement
`days_until(other) = other - this`, which is the sign of `ALGORITHM.md` `days_between(a, b)`,
while C# `Subtract` is `this - other`. `PARITY.md` does not say the sign flips. That is open
(`O-11`).

**Naming.**

| ID | C# | Rust | Go | TypeScript | Python | Swift | Kotlin | C++ | C |
|---|---|---|---|---|---|---|---|---|---|
| NA01 | `AddMonths(months, away)` | `checked_add_months(i32, MonthOverflow)` | `AddMonths(n int, o Overflow)` | `addMonths(n, overflow?)` | `add_months(n, overflow=CLAMP)` | `adding(months:overflow:)` | `plusMonths(months, overflow)` | `add_months(int, overflow)` | `nepdate_add_months(date, n, overflow, &out)` |
| NA02 | `AddDays(days)` | `checked_add_days(i32)` | `AddDays(n int)` | `addDays(n)` | `add_days(n)` | `adding(days:)` | `plusDays(days)` | `add_days(int)` | `nepdate_add_days(date, n, &out)` |
| NA03 | `AddYears(years, away)` | `checked_add_years(i32, MonthOverflow)` | `AddYears(n int, o Overflow)` | `addYears(n, overflow?)` | `add_years(n, overflow=CLAMP)` | `adding(years:overflow:)` | `plusYears(years, overflow)` | `add_years(int, overflow)` | `nepdate_add_years(date, n, overflow, &out)` |
| NA04 | `Subtract(date)` | `days_until(other)` or `diff(other)` | `DaysUntil` or `Diff` | `daysUntil` or `diff` | `days_until`, `__sub__` | `days(until:)`, `diff(to:)` | `daysUntil`, `until` | `days_until`, `diff` | `nepdate_diff_days`, `nepdate_diff` |
| NA05 | `operator -` | none (`D-07`) | none (`D-07`) | none (`D-07`) | `date - date` (`D-07`) | none (`D-07`) | none (`D-07`) | none (`D-07`) | none (`D-07`) |

## 4. Formatting

| ID | C# signature | What the code does |
|---|---|---|
| NF01 | `override string ToString()` | `YYYY/MM/DD`, zero padded, ASCII digits, exactly 10 characters. |
| NF02 | `string ToString(DateFormats dateFormat, Separators separator = Separators.ForwardSlash, bool leadingZeros = true)` | Writes the three fields in the requested order with the requested separator and optional padding. |
| NF03 | `string ToLongDateString(bool leadingZeros = true, bool displayDayName = false, bool displayYear = true)` | `[Weekday, ]Month day[, year]`, English names, padded day by default. |
| NF04 | `string ToUnicodeString(DateFormats dateFormat = DateFormats.YearMonthDay, Separators separator = Separators.ForwardSlash, bool leadingZeros = true)` | `ToString` with every ASCII digit replaced by its Devanagari counterpart. |
| NF05 | `string ToLongDateUnicodeString(bool leadingZeros = true, bool displayDayName = false, bool displayYear = true)` | Long form with Devanagari month name, weekday name and digits. |
| NF06 | `string ToString(string format, IFormatProvider formatProvider = null)` | Standard patterns `""`, `G`, `g`, `d`, `D`, `s`; anything else is the custom pattern language. The provider is ignored. |
| NF07 | `bool ISpanFormattable.TryFormat(Span<char>, out int, ReadOnlySpan<char>, IFormatProvider)` | Formats into the caller's buffer; false when it does not fit. |
| NF08 | `enum DateFormats` | Six orders: `YearMonthDay`, `YearDayMonth`, `MonthYearDay`, `MonthDayYear`, `DayYearMonth`, `DayMonthYear`. |
| NF09 | `enum Separators` | Six separators: `/`, `\`, `.`, `_`, `-`, space. |
| NF10 | `enum NepaliMonths` | Twelve month names, `Baishakh` (1) to `Chaitra` (12). |

**Required behaviour.** The long form is `[<Weekday>, ]<Month> <day>[, <year>]`. `pad` pads
month and day to two digits, the year is always four digits, and the weekday appears only when
requested. `Formatter` output is covered by the `to_string`, `unicode`, `long_en`,
`long_en_weekday`, `long_ne`, `long_ne_weekday` and `dmy_dash_nopad` columns of `dates.tsv`,
and by the 451 rows of `format-pattern.tsv`.

Custom pattern tokens: `yyyy` and longer runs write the four-digit year; `y`, `yy` and `yyy`
write the last two digits; `MMMM` writes the full month name; `MMM` writes the first three
characters of the English name; `MM` writes two digits; `M` writes the number; `dd` writes two
digits; any other run of `d` writes the number; a backslash escapes the next character; text
inside single quotes is literal.

`MMM` has a C# defect: `Ashad` and `Ashoj` both become `Ash`. `D-04` fixes them to `Asa` and
`Aso`. Every other `MMM` output matches C#.

The Unicode forms are the same formatters with `Lang::Ne` in the ports, not separate methods.
`D-15` keeps the standard patterns and allows Nepali output through the language selector.

**Naming.**

| ID | C# | Rust | Go | TypeScript | Python | Swift | Kotlin | C++ | C |
|---|---|---|---|---|---|---|---|---|---|
| NF01 | `ToString()` | `Display` | `String()` | `toString()` | `__str__` | `description` | `toString()` | `to_string()` | `nepdate_format(date, NULL, ...)` |
| NF02 | `ToString(order, sep, pad)` | `short(order, sep, pad, lang)` | `Short(o, sep, pad, lang)` | `short({order, separator, pad, lang})` | `short(order, sep, pad, lang)` | `short(order:separator:pad:lang:)` | `toShortString(order, separator, pad, lang)` | `to_chars_short` | `nepdate_format_short` |
| NF03 | `ToLongDateString(...)` | `long(LongDate, lang)` | `Long(LongOptions, lang)` | `long({weekday, year, pad, lang})` | `long(weekday, year, pad, lang)` | `long(weekday:year:pad:lang:)` | `toLongString(weekday, year, pad, lang)` | `to_chars_long` | `nepdate_format_long` |
| NF04 | `ToUnicodeString(...)` | `short(..., Lang::Ne)` | `Short(..., Nepali)` | `short({lang: "ne"})` | `short(..., lang=Lang.NE)` | `short(..., lang: .nepali)` | `toShortString(..., Lang.NEPALI)` | `to_chars_short(..., lang::ne)` | `NEPDATE_NEPALI` |
| NF05 | `ToLongDateUnicodeString(...)` | `long(..., Lang::Ne)` | `Long(..., Nepali)` | `long({lang: "ne"})` | `long(..., lang=Lang.NE)` | `long(..., lang: .nepali)` | `toLongString(..., Lang.NEPALI)` | `to_chars_long(..., lang::ne)` | `NEPDATE_NEPALI` |
| NF06 | `ToString(pattern, provider)` | `format_pattern(pattern, lang)` | `Format(pattern, lang)` | `format(pattern, lang)` | `format(pattern, lang)` | `format(_:lang:)` | `format(pattern, lang)` | `to_chars_pattern` | `nepdate_format` |
| NF07 | `ISpanFormattable.TryFormat` | `write_to` | `Append*` | none | none | `append*` | `append*String`, `formatTo` | `to_chars*` | `snprintf` semantics |
| NF08 | `DateFormats` | `DateOrder` | `DateOrder` | `DateOrder` string union | `DateOrder` enum | `DateOrder` enum | `DateOrder` enum | `date_order` | `nepdate_order` |
| NF09 | `Separators` | `Separator` | `Separator` | `Separator` string union | `Separator` enum | `Separator` enum | `Separator` enum | `separator` | `nepdate_separator` |
| NF10 | `NepaliMonths` | `Month` | `Month` | none (functions `monthName`, `monthShortName`) | `Month` | `Month` | `Month` | `month` | `nepdate_month` |

## 5. Parsing

| ID | C# signature | What the code does |
|---|---|---|
| NP01 | `static NepaliDate Parse(string rawNepaliDate)` | Strict parse; throws `InvalidNepaliDateFormatException` on failure. |
| NP02 | `static NepaliDate Parse(string rawNepaliDate, bool autoAdjust, bool monthInMiddle = true)` | Strict parse plus the ND03 heuristics. |
| NP03 | `static bool TryParse(string rawNepDate, out NepaliDate result)` | Non-throwing strict parse; false leaves the default result. |
| NP04 | `static bool TryParse(string rawNepDate, out NepaliDate result, bool autoAdjust, bool monthInMiddle = true)` | Non-throwing parse with the ND03 heuristics. |
| NP05 | `static NepaliDate IParsable<NepaliDate>.Parse(string, IFormatProvider)` and `TryParse` | .NET 7 interface; delegates to NP01 and NP03; the provider is ignored. |
| NP06 | `static NepaliDate ISpanParsable<NepaliDate>.Parse(ReadOnlySpan<char>, IFormatProvider)` and `TryParse` | .NET 7 interface on spans; copies to a string and delegates. |
| NP07 | `static NepaliDate SmartDateParser.Parse(string input)` | Lenient parse: strict first, then normalization, Devanagari digits, month names, suffixes, and permutation heuristics. |
| NP08 | `static bool SmartDateParser.TryParse(string input, out NepaliDate result)` | Non-throwing lenient parse; catches every exception. |
| NP09 | `sealed class InvalidNepaliDateFormatException : FormatException` | The parse and format failure type. |

**Required behaviour.** Strict parsing accepts exactly year, month and day in that order.
Separators are `-`, `/`, `.`, `_`, `\`, space, `|` and `।` (U+0964). Leading, trailing and
repeated separators are ignored. A fourth group, fewer than three groups, or any other
character fails. C# does not cap the number of digits in a group, so a long run can overflow
`int`; `D-05` caps a group at four digits and accepts Devanagari digits, mixed with ASCII.
`parse.tsv` has 69 rows with the strict and lenient result, and `csharp-golden/parse.tsv` has
42 rows recorded from C# for comparison only.

`autoAdjust` is three heuristics: if the day is over 32, swap year and day; if
`monthInMiddle` is false, swap month and day; if the month is over 12 and the day is under 13,
swap them; if the year is under 1000, add 2000. `D-05` and `D-06` replace this with a strict
parser and a deterministic lenient parser, so no port needs NP02 or NP04.

`SmartDateParser` is deliberately fuzzy in C#: it normalizes whitespace, removes `B.S.`,
`V.S.`, `गते` and `मिति`, converts Devanagari digits, finds the longest month name anywhere
in the string, and then tries the YMD, DMY and MDY orders before a six-permutation fallback.
It expands two-digit years to 20xx and ignores extra numeric groups. `D-06` replaces this
with the closed month list and explicit rules of `PARSING.md`; the vectors are `parse.tsv`.

The exception inherits `FormatException`. A port uses its own error type but must expose the
parse error kinds of `PARSING.md` section 4.

**Naming.**

| ID | C# | Rust | Go | TypeScript | Python | Swift | Kotlin | C++ | C |
|---|---|---|---|---|---|---|---|---|---|
| NP01 | `Parse(string)` | `FromStr::from_str` | `Parse(s)` | `NepaliDate.parse(s)` | `NepaliDate.parse(s)` | `NepaliDate.parse(_:)` | `NepaliDate.parse(text)` | `parse(string_view)` | `nepdate_parse(text, len, &out)` |
| NP02 | `Parse(string, autoAdjust, monthInMiddle)` | none (`D-05`, `D-06`) | none (`D-05`, `D-06`) | none (`D-05`, `D-06`) | none (`D-05`, `D-06`) | none (`D-05`, `D-06`) | none (`D-05`, `D-06`) | none (`D-05`, `D-06`) | none (`D-05`, `D-06`) |
| NP03 | `TryParse(string, out)` | none (`open O-05`) | none (`open O-05`) | `NepaliDate.tryParse(s)` | none (`open O-05`) | `init?(_:)` | `NepaliDate.parseOrNull(text)` | none (`open O-05`) | status return |
| NP04 | `TryParse(string, out, autoAdjust, monthInMiddle)` | none (`D-06`) | none (`D-06`) | none (`D-06`) | none (`D-06`) | none (`D-06`) | none (`D-06`) | none (`D-06`) | none (`D-06`) |
| NP05 | `IParsable` | `FromStr` (`D`) | none | none | none | `LosslessStringConvertible` (`D`) | none | none | none |
| NP06 | `ISpanParsable` | none | none | none | none | none | none | `parse(string_view)` (`D`) | `nepdate_parse(text, len)` (`D`) |
| NP07 | `SmartDateParser.Parse` | `parse_lenient(s)` | `ParseLenient(s)` | `NepaliDate.parseLenient(s)` | `NepaliDate.parse_lenient(s)` | `NepaliDate.parseLenient(_:)` | `NepaliDate.parseLenient(text)` | `parse_lenient(string_view)` | `nepdate_parse_lenient(text, len, &out)` |
| NP08 | `SmartDateParser.TryParse` | none (`open O-05`) | none (`open O-05`) | none (`open O-05`) | none (`open O-05`) | none (`open O-05`) | none (`open O-05`) | none (`open O-05`) | status return |
| NP09 | `InvalidNepaliDateFormatException` | `Error::Parse(ParseErrorKind)` | `*ParseError` plus sentinels | `NepDateError` | `NepDateError` | `NepDateError` | `NepDateException` | `errc` and `result<T>` | `nepdate_status` |

## 6. Ranges

| ID | C# signature | What the code does |
|---|---|---|
| NR01 | `readonly struct NepaliDateRange : IEnumerable<NepaliDate>, IEquatable<NepaliDateRange>` | Inclusive range from `Start` to `End`; both ends are dates. |
| NR02 | `NepaliDateRange(NepaliDate start, NepaliDate end)` | Stores the bounds; `start > end` means an empty range, not an error. |
| NR03 | `NepaliDate Start { get; }` | First date. |
| NR04 | `NepaliDate End { get; }` | Last date, inclusive. |
| NR05 | `bool IsEmpty { get; }` | `Start > End`. |
| NR06 | `int Length { get; }` | Number of days, inclusive; 0 for an empty range. |
| NR07 | `static NepaliDateRange SingleDay(NepaliDate date)` | Range of one date. |
| NR08 | `static NepaliDateRange FromDayCount(NepaliDate start, int days)` | `start` to `start + days - 1`; `days` must be at least 1. |
| NR09 | `static NepaliDateRange ForMonth(int year, int month)` | Day 1 to the last day of the BS month. |
| NR10 | `static NepaliDateRange ForFiscalYear(int fiscalYear)` | 1 Shrawan of the fiscal year to the last day of Ashad of the next year. |
| NR11 | `static NepaliDateRange ForCalendarYear(int year)` | 1 Baishakh to the last day of Chaitra. |
| NR12 | `static NepaliDateRange CurrentMonth()` | `ForMonth` of today's BS month. |
| NR13 | `static NepaliDateRange CurrentFiscalYear()` | `ForFiscalYear` of today's fiscal year. |
| NR14 | `static NepaliDateRange CurrentCalendarYear()` | `ForCalendarYear` of today's BS year. |
| NR15 | `bool Contains(NepaliDate date)` | True when the range is not empty and the date is between the bounds. |
| NR16 | `bool Contains(NepaliDateRange other)` | True when this range fully contains the other; an empty other is contained by any non-empty range. |
| NR17 | `bool Overlaps(NepaliDateRange other)` | True when the two non-empty ranges share a date. |
| NR18 | `bool IsAdjacentTo(NepaliDateRange other)` | True when one range starts the day after the other ends. |
| NR19 | `NepaliDateRange Intersect(NepaliDateRange other)` | Overlap, or an empty range when they do not overlap. |
| NR20 | `NepaliDateRange Union(NepaliDateRange other)` | Smallest range covering both; `this` or `other` when one is empty. |
| NR21 | `NepaliDateRange[] Except(NepaliDateRange other)` | This range with the other removed; zero, one or two ranges. |
| NR22 | `NepaliDateRange[] SplitByMonth()` | One range per month touched, clipped at the range ends. |
| NR23 | `NepaliDateRange[] SplitByFiscalQuarter()` | One range per fiscal quarter touched, clipped at the range ends. |
| NR24 | `IEnumerable<NepaliDate> DatesWithInterval(int interval)` | Every `interval` days from `Start`; `interval` must be at least 1. |
| NR25 | `IEnumerable<NepaliDate> WorkingDays(bool excludeSunday = false)` | Every day except Saturday, and except Sunday when asked. |
| NR26 | `IEnumerable<NepaliDate> WeekendDays(bool includeSunday = true)` | Every Saturday, and Sunday when asked. |
| NR27 | `IEnumerator<NepaliDate> GetEnumerator()` | Every day from `Start` to `End`. |
| NR28 | `override string ToString()` | `"start - end"`, or `"Empty Range"`. |
| NR29 | `string ToString(DateFormats format, Separators separator = Separators.ForwardSlash)` | The two dates formatted with the same options, separated by `" - "`. |
| NR30 | `Equals`, `GetHashCode`, `operator ==`, `operator !=` | Value equality of the bounds; two empty ranges are equal. |

**Required behaviour.** A range is inclusive and non-empty in every port that can represent
only valid dates. The C# empty range exists because a struct cannot refuse `start > end`.
`D-09` keeps a range with construction, bounds, length, containment and iteration, and drops
the set operations, the split helpers, the interval and working-day helpers and the string
forms. No vector file covers those C# operations, so a port that adds one has to define it in
the hub spec first.

C# has a defect worth not copying: two empty ranges compare equal but hash their different
bounds, so equal values can hash differently. A port that supports an empty range should hash
only the bounds when non-empty and a constant when empty.

**Naming.**

| ID | C# | Rust | Go | TypeScript | Python | Swift | Kotlin | C++ | C |
|---|---|---|---|---|---|---|---|---|---|
| NR01 | `NepaliDateRange` | `NepaliDateRange` | `Range` | `DateRange` | `DateRange` | `NepaliDateRange` | `NepaliDateRange` | `date_range` | `nepdate_range` |
| NR02 | `new NepaliDateRange(start, end)` | `NepaliDateRange::new(start, end) -> Option` | `NewRange(start, end) (Range, bool)` | `DateRange.of(start, end)` | `DateRange(start, end)` | `NepaliDateRange(_:_:)` optional | `NepaliDateRange.of(start, end)` | `date_range::make` | `nepdate_range_make` |
| NR03 | `Start` | `start()` | `Start()` | `start` | `start` | `lowerBound` | `start` | `first()` | `start` |
| NR04 | `End` | `end()` | `End()` | `end` | `end` | `upperBound` | `endInclusive` | `last()` | `end` |
| NR05 | `IsEmpty` | none (`D-01`) | none (`D-01`) | none (`D-01`) | none (`D-01`) | none (`D-01`) | none (`D-01`) | none (`D-01`) | none (`D-01`) |
| NR06 | `Length` | `len() -> u32` | `Len() int` | `length` | `len(range)` | `count` | `size` | `size()` | `nepdate_range_length` |
| NR07 | `SingleDay` | `NepaliDateRange::new(d, d)` | `NewRange(d, d)` | `DateRange.of(d, d)` | `DateRange(d, d)` | `NepaliDateRange(d, d)` | `NepaliDateRange.of(d, d)` | `date_range::make(d, d)` | `nepdate_range_make(d, d)` |
| NR08 | `FromDayCount` | `NepaliDateRange::new(start, start + n - 1)` | `NewRange` with `AddDays` | `DateRange.of` with `addDays` | `DateRange` with `add_days` | `NepaliDateRange` with `adding` | `NepaliDateRange.of` | `date_range::make` | `nepdate_range_make` |
| NR09 | `ForMonth` | `NepaliDateRange::month(y, m)` | `MonthRange(y, m)` | `DateRange.month(y, m)` | `DateRange.month(y, m)` | `NepaliDateRange.month(year:month:)` | `NepaliDateRange.ofMonth(y, m)` | `date_range::of_month` | `nepdate_range_of_month` |
| NR10 | `ForFiscalYear` | `FiscalYear::range()` | `FiscalYear.Range()` | `FiscalYear.range()` | `FiscalYear.range()` | `FiscalYear.range()` | `FiscalYear.range()` | `fiscal_year::range()` | `nepdate_range_of_fiscal_year` |
| NR11 | `ForCalendarYear` | `NepaliDateRange::year(y)` | `YearRange(y)` | `DateRange.year(y)` | `DateRange.year(y)` | `NepaliDateRange.year(_:)` | `NepaliDateRange.ofYear(y)` | `date_range::of_year` | `nepdate_range_of_year` |
| NR12 | `CurrentMonth` | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) |
| NR13 | `CurrentFiscalYear` | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) |
| NR14 | `CurrentCalendarYear` | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) |
| NR15 | `Contains(date)` | `contains(date)` | `Contains(d)` | `contains(date)` | `date in range` | `contains(_:)` | `contains(element)` | `contains(date)` | `nepdate_range_contains` |
| NR16 | `Contains(range)` | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) |
| NR17 | `Overlaps` | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) |
| NR18 | `IsAdjacentTo` | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) |
| NR19 | `Intersect` | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) |
| NR20 | `Union` | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) |
| NR21 | `Except` | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) |
| NR22 | `SplitByMonth` | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) |
| NR23 | `SplitByFiscalQuarter` | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) |
| NR24 | `DatesWithInterval` | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) |
| NR25 | `WorkingDays` | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) |
| NR26 | `WeekendDays` | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) | none (`D-09`) |
| NR27 | `GetEnumerator` | `IntoIterator` | `Days()` | `[Symbol.iterator]` | `__iter__` | `Collection` | `List` | `begin`/`end` | `nepdate_range_begin`/`next` |
| NR28 | `ToString()` | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | inherited `toString` (D) | none (`open O-10`) | none (`open O-10`) |
| NR29 | `ToString(format, sep)` | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) | none (`open O-10`) |
| NR30 | `Equals`, hash, `==`, `!=` | `PartialEq`, `Hash` | comparable struct | none | none | `Hashable` | inherited `AbstractList` (D) | `operator==` | none |

## 7. Fiscal year

| ID | C# signature | What the code does |
|---|---|---|
| NY01 | `enum FiscalYearQuarters` | `Current = 0`, `First = 4`, `Second = 7`, `Third = 10`, `Fourth = 1`; the value is the first month of the quarter. |
| NY02 | `NepaliDate FiscalYearStartDate(int yearOffset = 0)` | 1 Shrawan of the fiscal year containing this date, plus the offset. |
| NY03 | `NepaliDate FiscalYearEndDate(int yearOffset = 0)` | Last day of Ashad of the fiscal year, plus the offset. |
| NY04 | `(NepaliDate startDate, NepaliDate endDate) FiscalYearStartAndEndDate(int yearOffset = 0)` | The two values above. |
| NY05 | `NepaliDate FiscalYearQuarterStartDate(FiscalYearQuarters q = Current, int yearOffset = 0)` | First day of the requested quarter; `Current` resolves from this date's month. |
| NY06 | `NepaliDate FiscalYearQuarterEndDate(FiscalYearQuarters q = Current, int yearOffset = 0)` | Last day of the requested quarter. |
| NY07 | `(NepaliDate startDate, NepaliDate endDate) FiscalYearQuarterStartAndEndDate(FiscalYearQuarters q = Current, int yearOffset = 0)` | The two quarter values. |
| NY08 | `static NepaliDate GetFiscalYearStartDate(int fiscalYear)` | 1 Shrawan of the named fiscal year. |
| NY09 | `static NepaliDate GetFiscalYearEndDate(int fiscalYear)` | Last day of Ashad of the named fiscal year. |
| NY10 | `static (NepaliDate, NepaliDate) GetFiscalYearStartAndEndDate(int fiscalYear)` | The two static values above. |
| NY11 | `static NepaliDate GetFiscalYearQuarterStartDate(int fiscalYear, int month)` | Builds `fiscalYear-month-1` and asks for its quarter start. |
| NY12 | `static NepaliDate GetFiscalYearQuarterEndDate(int fiscalYear, int month)` | Builds `fiscalYear-month-1` and asks for its quarter end. |
| NY13 | `static (NepaliDate, NepaliDate) GetFiscalYearQuarterStartAndEndDate(int fiscalYear, int month)` | The two static quarter values. |

**Required behaviour.** A fiscal year starts on 1 Shrawan (month 4) and ends on the last day
of Ashad (month 3) of the next BS year. For a date in months 1 to 3, the containing fiscal
year is the previous BS year. Quarters are Q1 Shrawan to Ashoj, Q2 Kartik to Poush, Q3 Magh to
Chaitra and Q4 Baishakh to Ashad of the next year. `dates.tsv` has `fy_start`, `fy_end`,
`quarter_start` and `quarter_end` for all 1018 rows; boundary rows are `ERR` where the result
would leave the supported range.

The static `Get*` methods take `fiscalYear` as a calendar year and `month` as a month within
that calendar year. That is why `GetFiscalYearQuarterStartDate(2080, 4)` is 2080-04-01 but the
same call with month 1 returns the Q4 range that starts in 2081. `D-08` replaces the instance
offset methods and the static helpers with a fiscal-year value: containing date, start, end,
quarter start and end, and a label. The vector columns still match.

**Naming.**

| ID | C# | Rust | Go | TypeScript | Python | Swift | Kotlin | C++ | C |
|---|---|---|---|---|---|---|---|---|---|
| NY01 | `FiscalYearQuarters` | `Quarter` | `Quarter` | `Quarter` | `Quarter` | `Quarter` | `Quarter` | `quarter` | `nepdate_quarter` |
| NY02 | `FiscalYearStartDate(offset)` | `FiscalYear::containing(d).start()` | `FiscalYearOf(d).Start()` | `FiscalYear.containing(d).start()` | `FiscalYear.containing(d).start()` | `FiscalYear(containing: d).start()` | `FiscalYear.containing(d).start()` | `fiscal_year::of(d).start()` | `nepdate_fiscal_year_of` plus start |
| NY03 | `FiscalYearEndDate(offset)` | `.end()` | `.End()` | `.end()` | `.end()` | `.end()` | `.end()` | `.end()` | `nepdate_fiscal_year_end` |
| NY04 | `FiscalYearStartAndEndDate(offset)` | `.range()` | `.Range()` | `.range()` | `.range()` | `.range()` | `.range()` | `.range()` | none |
| NY05 | `FiscalYearQuarterStartDate(q, offset)` | `.quarter_range(q)` | `.QuarterRange(q)` | `.quarterRange(q)` | `.quarter_range(q)` | `.range(of: q)` | `.range(q)` | `.quarter_range(q)` | `nepdate_quarter_start(fy, q)` |
| NY06 | `FiscalYearQuarterEndDate(q, offset)` | `.quarter_range(q).end()` | `.QuarterRange(q).End()` | `.quarterRange(q).end` | `.quarter_range(q).end` | `.range(of: q).upperBound` | `.range(q).endInclusive` | `.quarter_range(q).last()` | `nepdate_quarter_end(fy, q)` |
| NY07 | `FiscalYearQuarterStartAndEndDate(q, offset)` | `.quarter_range(q)` | `.QuarterRange(q)` | `.quarterRange(q)` | `.quarter_range(q)` | `.range(of: q)` | `.range(q)` | `.quarter_range(q)` | none |
| NY08 | `GetFiscalYearStartDate(fy)` | `FiscalYear::new(fy).start()` | `FiscalYear(fy).Start()` | `new FiscalYear(fy).start()` | `FiscalYear(fy).start()` | `FiscalYear(startYear: fy).start()` | `FiscalYear(fy).start()` | `fiscal_year(fy).start()` | `nepdate_fiscal_year_start` |
| NY09 | `GetFiscalYearEndDate(fy)` | `.end()` | `.End()` | `.end()` | `.end()` | `.end()` | `.end()` | `.end()` | `nepdate_fiscal_year_end` |
| NY10 | `GetFiscalYearStartAndEndDate(fy)` | `.range()` | `.Range()` | `.range()` | `.range()` | `.range()` | `.range()` | `.range()` | none |
| NY11 | `GetFiscalYearQuarterStartDate(fy, month)` | none (`D-08`) | none (`D-08`) | none (`D-08`) | none (`D-08`) | none (`D-08`) | none (`D-08`) | none (`D-08`) | `nepdate_quarter_start` with the quarter |
| NY12 | `GetFiscalYearQuarterEndDate(fy, month)` | none (`D-08`) | none (`D-08`) | none (`D-08`) | none (`D-08`) | none (`D-08`) | none (`D-08`) | none (`D-08`) | `nepdate_quarter_end` with the quarter |
| NY13 | `GetFiscalYearQuarterStartAndEndDate(fy, month)` | none (`D-08`) | none (`D-08`) | none (`D-08`) | none (`D-08`) | none (`D-08`) | none (`D-08`) | none (`D-08`) | none |

## 8. Patro

| ID | C# signature | What the code does |
|---|---|---|
| NT01 | `readonly struct CalendarInfo` | Immutable snapshot with the five members below. |
| NT02 | `string TithiNp { get; }` | Devanagari tithi name, or empty outside the data range. |
| NT03 | `string TithiEn { get; }` | English tithi name, or empty. |
| NT04 | `bool IsPublicHoliday { get; }` | Gazetted holiday flag. |
| NT05 | `string[] EventsNp { get; }` | Devanagari event names in file order; empty array when none. |
| NT06 | `string[] EventsEn { get; }` | English event names in file order; empty array when none. |
| NT07 | `CalendarInfo GetCalendarInfo()` | One lookup returning all five. |

**Required behaviour.** The C# properties and `GetCalendarInfo` return empty values outside
the data range, never null. The actual data covers 2077-01-01 to 2084-08-20 BS, not the
2001-2089 that the C# XML comments claim. `PATRO.md` section 4 has the anchor days:
2081-01-01 is Panchami, a holiday, with New Year, Mesh Sankranti and Bisket Jatra; 2081-02-15
is Panchami, a holiday, with Republic Day; 2080-11-01 has five events; 2081-04-15 has three
events and is not a holiday; 2070-06-15 and 2090-01-01 are empty. `patro-summary.json` gives
the counts: 2190 tithi days, 32 tithi names, 294 holidays, 1671 event days, 3032 events, 722
event names, 754 names and 59,851 name bytes.

`D-13` moves the patro to a separate package that depends on the core. The query shape is
`info(date)` returning a `CalendarInfo` with a tithi option, a holiday flag and an ordered
event list. The core package has no tithi, holiday or event data.

**Naming.**

| ID | C# | Rust | Go | TypeScript | Python | Swift | Kotlin | C++ | C |
|---|---|---|---|---|---|---|---|---|---|
| NT01 | `CalendarInfo` | `nepdate_patro::CalendarInfo` | `patro.Info` | `CalendarInfo` | `CalendarInfo` | `CalendarInfo` | `CalendarInfo` | `patro::day_info` | `nepdate_patro_day_info` |
| NT02 | `TithiNp` | `info(d).tithi().name(Lang::Ne)` | `Info.Tithi().Name(Nepali)` | `info(d).tithi?.np` | `info(d).tithi.label(Lang.NE)` | `d.calendarInfo.tithi?.nepali` | `d.calendarInfo.tithi?.nepali` | `info(d).tithi()->name(lang::ne)` | `info.tithi.np` |
| NT03 | `TithiEn` | `...name(Lang::En)` | `...Name(English)` | `...tithi?.en` | `...label(Lang.EN)` | `...tithi?.english` | `...tithi?.english` | `...name(lang::en)` | `info.tithi.en` |
| NT04 | `IsPublicHoliday` | `info(d).is_public_holiday()` | `Info.IsPublicHoliday()` | `info(d).isPublicHoliday` | `info(d).is_public_holiday` | `...isPublicHoliday` | `...isPublicHoliday` | `...is_public_holiday()` | `info.is_public_holiday` |
| NT05 | `EventsNp` | `info(d).events()` plus `name(Lang::Ne)` | `Info.Events()` plus `Name(Nepali)` | `info(d).events.map(e => e.np)` | `[e.label(Lang.NE) for e in info(d).events]` | `...events.map(\.nepali)` | `...events.map { it.nepali }` | `...events()` plus `name(lang::ne)` | `nepdate_patro_events` |
| NT06 | `EventsEn` | same with `Lang::En` | same with `English` | `...map(e => e.en)` | `...label(Lang.EN)` | `...map(\.english)` | `...map { it.english }` | `...name(lang::en)` | same, English bytes |
| NT07 | `GetCalendarInfo()` | `nepdate_patro::info(d)` | `patro.Of(d)` | `info(d)` | `info(d)` | `d.calendarInfo` | `Patro.info(d)`, `d.calendarInfo` | `patro::info(d)` | `nepdate_patro_info` |

## C# convenience overloads

These exist for C# convenience. A port should offer the idiomatic equivalent, not copy every
signature.

| Convenience | Equivalent |
|---|---|
| `NepaliDate(string)` | `NepaliDate.Parse(string)`; both call `SplitNepaliDate` and validate. |
| `NepaliDate(string, autoAdjust, monthInMiddle)` | `NepaliDate.Parse(string, autoAdjust, monthInMiddle)`. |
| `Parse(string, bool, bool)` and `TryParse(string, out, bool, bool)` | The strict parse plus the three heuristics. `D-05` and `D-06` replace them. |
| `ToString("d")` | `ToString()`. |
| `ToUnicodeString(...)` | `ToString(...)` followed by the digit map. |
| `ToLongDateUnicodeString(...)` | `ToLongDateString(...)` followed by the digit and name maps. |
| `ToLongDateString`'s three bools | A long-date options struct with weekday, year and pad. |
| `AddYears(years, away)` | `AddMonths(years * 12, away)`. |
| `AddMonths` with a negative value | `SubtractMonths(abs(value), away)`, which mirrors the positive path. |
| `Subtract(date)` | `operator -`. |
| `MonthEndDate()` | `new NepaliDate(Year, Month, MonthEndDay)`. |
| `FiscalYearStartAndEndDate` and the other paired methods | Tuples of the two single methods. |
| `GetFiscalYear*` static methods | A fiscal-year value plus its single methods. `D-08` uses the value. |
| `GetCalendarInfo()` | The individual tithi, holiday and event properties, in one lookup. |
| `BulkConvert` and `BatchProcess*` | A language map or parallel map. `D-10` drops them. |
| `Equals(object)` and `CompareTo(object)` | The typed equality and ordering of the language. |
| `Today` and `Now` | The same date; `D-14` keeps one explicit-zone today helper at most. |
| `IsToday`, `IsYesterday`, `IsTomorrow` | `today(zone)`, plus or minus a day. `D-14` drops them. |

## Open decisions

These are the points the owner must settle before the ports change. The recommendation is the
audit's, not a decision.

| ID | Decision | Recommendation |
|---|---|---|
| O-01 | Add a year-length member to every port so `D-12` has its stated replacement? | Yes. Name it `year_length` / `yearLength` / `YearLength`, returning 364 to 367. |
| O-02 | Keep `Now` in the canonical API? | No. A date has no time of day; drop it and extend `D-14`. |
| O-03 | Port `IsYesterday` and `IsTomorrow`? | No. Keep `D-14`; a caller does `today(zone).addDays(-1)`. |
| O-04 | Keep the `autoAdjust` parse overload? | No. Keep `D-05` and `D-06`; the lenient parser replaces it. |
| O-05 | Require a non-throwing parse in every port? | Yes. Add `try_parse` / `TryParse` / `tryParse` / `parseOrNull` next to the throwing form. |
| O-06 | Port `BulkConvert` and the batch methods? | No. Keep `D-10`; language map tools are better and the C# order is unspecified. |
| O-07 | How far should serialization go? | Keep `D-11`: one `YYYY-MM-DD` string. Add native hooks only where the language has a standard protocol (Rust `serde`, Go `TextMarshaler`, Swift `Codable`, JavaScript `toJSON`); no object, XML or Newtonsoft forms. |
| O-08 | Port the `TypeConverter` and its `YYYYMMDD` integer? | No. Add a new D row saying that integer conversion is C#-only, or drop the integer part and keep a string converter where the platform asks for one. |
| O-09 | Add the range set operations, splits and working-day helpers? | No for this round. Keep `D-09`; revisit if a user asks. They are the largest missing surface. |
| O-10 | Add `SingleDay`, `FromDayCount`, the `Current*` factories and range `ToString`? | Add only `ToString` (one line, useful in logs). The factories are one-line constructors in every language. |
| O-11 | Which sign should `days_until` have? | Keep `other - this`, the `ALGORITHM.md` direction, and add that sentence to `D-07`. C# `Subtract` is the opposite direction. |
| O-12 | Rename `NepaliDate` to `Date` in some ports? | No. Go uses `Date` because the package name is the qualifier; keep the other names as they are. |
| O-13 | Add Swift `FormatStyle` and `Strideable`? | Yes. `formatted()` and `stride(from:to:by:)` are what Swift users expect. |
| O-14 | Override `equals`, `hashCode` and `toString` on the Kotlin range? | Yes. The inherited `AbstractList` versions compare and print every day. |
| O-15 | Make TypeScript `equals` return false for a foreign value? | Yes. A thrown `TypeError` from `#serial` is a poor library error. |
| O-16 | Add Python `fromisoformat` and the `sep` argument of `isoformat`? | Yes. It is the `datetime.date` protocol. |
| O-17 | Add `NEPDATE_MIN` and `NEPDATE_MAX` date constants to C? | Yes. The year macros are not a date. |
| O-18 | Change C++ `result::value()` on an error from `abort()` to a throw? | Yes, but as a separate breaking change. `std::expected` uses `bad_expected_access`. |
| O-19 | Make Go's `Time(nil)` use the same zone as `Today(nil)`? | Yes, or remove the nil default from one of them. Today is Nepal; `Time` is UTC. |
| O-20 | Add a canonical `DateOnly` conversion? | No. C# has none. Keep the platform Gregorian date as the port's equivalent and document it per language. |
