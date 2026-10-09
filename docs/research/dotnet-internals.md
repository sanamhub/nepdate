# How C# NepDate stores and reads its data

What every port has to match or beat, read from the C# source at commit `cb05cb65` (`src/NepDate`
is identical to the 2.0.7 NuGet build, ALGORITHM §10). Paths below are relative to `src/NepDate/`.
Timings and allocations come from [`docs/benchmarks/dotnet.md`](../benchmarks/dotnet.md) (.NET 10
column) unless a line says otherwise.

## 1. The `NepaliDate` struct

`NepaliDate` is a `readonly partial struct` (`NepaliDate.cs:21`) with four fields:

| Field | Declared at | Type |
|---|---|---|
| `Year`, `Month`, `Day` | `Properties.cs:48`, `:57`, `:66` | `int` auto-properties |
| `_englishDate` | `Properties.cs:71` | `DateTime?` |

`Unsafe.SizeOf<NepaliDate>()` is **32 bytes** (measured with `tools/dotnet-bench -- --inputs`):
12 bytes of `int`, 4 bytes of padding, 16 bytes for `Nullable<DateTime>` (a `bool` plus the 8-byte
`DateTime`, padded). A serial-day model needs 4 bytes.

Every constructor computes the AD date eagerly and stores it (`NepaliDate.cs:105`, `:250`), so
`EnglishDate` (`Properties.cs:81`) and `DayOfWeek` (`Properties.cs:93`, `EnglishDate.DayOfWeek`)
are field reads afterwards. The price is that building a BS date always pays for a BS to AD
conversion, even when the caller never asks for AD. `default(NepaliDate)` has no AD date, and
`EnglishDate` throws on it.

Equality and hashing use `Year * 10000 + Month * 100 + Day` (`Properties.cs:32`,
`Abilities/Equatable.cs:22-34`), not the AD field.

## 2. The two conversion tables

Both are `static readonly` arrays of `(int, int, int, int)` value tuples, one entry per month:

| Table | Declared at | Entries | Entry | Index |
|---|---|---:|---|---|
| `NepaliToEnglish.data` | `Core/Dictionaries/NepaliToEnglish.cs:10` | 3588 | (BS month length, AD year, AD month, AD day of that BS month's **last** day) | `(y - 1901) * 12 + (m - 1)` |
| `EnglishToNepali.data` | `Core/Dictionaries/EnglishToNepali.cs:13` | 3589 | (AD month length, BS year, BS month, BS day of that AD month's last day) | `(y - 1844) * 12 + (m - 4)` |

Each entry is 16 bytes, so the two tables hold about 115 KB on the heap after start-up.

**BS to AD** (`Core/Dictionaries/DictionaryBridge.cs:42-52`): one bounds check, one array read,
`new DateTime(adY, adM, adD)` (which converts civil to ticks), then `.AddDays(day - monthLength)`
through a `double`. The constructor first runs `ValidateAndThrow` (`NepaliDate.cs:31-50`), which
reads the same table entry once more for `MonthEndDay` (`Properties.cs:122`). B1: 13.5 ns, 0 bytes.

**AD to BS** (`DictionaryBridge.cs:117-122`, `:138-156`): one array read gives the BS date of the
AD month's last day, then `SubtractNepaliDays` walks back `adMonthLength - day` days, stepping
into the previous BS month (one more `NepaliToEnglish` read) while the day is `<= 0`. A walk of at
most 30 days crosses at most one or two BS month boundaries, so the loop is short and the whole
thing is O(1). The constructor (`NepaliDate.cs:233-252`) also compares against
`MinValue.EnglishDate` and `MaxValue.EnglishDate` (static readonly structs, `Properties.cs:156`,
`:162`) and calls `ValidateAndThrow` again. B2: 19.5 ns, 0 bytes.

**How the tables are built.** The C# compiler can embed a primitive array (`byte[]`, `ushort[]`)
as a raw data blob and copy it with one `RuntimeHelpers.InitializeArray` call. It can't do that for
an array of tuples, so it emits one store per element into the static constructor. Measured with
`System.Reflection.Metadata` on the 2.0.7 `lib/net8.0/NepDate.dll` (397,312 bytes):

| Method | IL bytes |
|---|---:|
| `EnglishToNepali..cctor` | 94,145 |
| `NepaliToEnglish..cctor` | 94,119 |
| `CalendarStrings..cctor` (patro string pool) | 19,265 |
| all other methods together | 20,075 |

So 188 KB of the DLL (47 %) is code that builds two tables at first use. In a fresh process on this
machine, the first `new NepaliDate(2080, 1, 1)` took 38 ms and the first AD to BS conversion a
further 31 ms (three runs, 37.8 to 39.4 ms and 31.3 to 33.8 ms; scratch program, not part of
`tools/`). Most of that is the JIT compiling and running these two static constructors. The 51,712-byte
`.rsrc` section is the Win32 icon from `<ApplicationIcon>` in `NepDate.csproj`.

## 3. Arithmetic on top of the tables

- `AddDays` (`NepaliDate.cs:456-459`): `EnglishDate.AddDays(days).ToNepaliDate()`. One
  `DateTime` add through `double`, then the full AD to BS constructor. B3: 19.8 ns, 0 bytes.
- `AddMonths` (`NepaliDate.cs:316-366`): month arithmetic in a `while` loop, then
  `new NepaliDate(year, month, 1)` only to read the target month's length (`:340`), then a second
  `new NepaliDate` for the result (`:365`). Each constructor validates and converts to AD, so one
  call does two full BS to AD conversions. Negative values go through `SubtractMonths`
  (`:383-433`). B4: 21.7 ns, 0 bytes.
- `DayOfYear` (`Properties.cs:103-114`) loops over the earlier months of the year, one table read
  each.
- `TryParse` (`Abilities/Parsing.cs:13-25`): a hand-written, allocation-free split
  (`NepaliDate.cs:675-727`), then `IsValidDate` (`:63-74`, a table read), then the constructor
  (validates again and converts). B6: 25.7 ns, 0 bytes.

## 4. `CalendarOffsets` and the patro arrays

The patro (tithi, holidays, events) does not use the conversion tables. It has its own day index:

- `CalendarOffsets.MonthStart` (`Core/Dictionaries/CalendarOffsets.cs:11`): a `ushort[1068]`, the
  day offset of the first day of each BS month from 2001-01-01, for BS 2001 to 2089.
  `GetOffset` (`:105-110`) is one subtraction, one range check and one array read, and returns -1
  outside 2001 to 2089. This is the third copy of the month lengths (ALGORITHM §10).
- Tithi (`TithiData.cs:8`, `:150`): `DayOffsets` is a sorted `ushort[2190]` and `PoolIds` a
  parallel `byte[2190]`. The offsets are contiguous (28126 to 30315, BS 2078-01-02 to 2083-12-30),
  yet the lookup is `Array.BinarySearch` (`:291-292`), up to 12 comparisons where one subtraction would do.
- Holidays (`HolidayData.cs:8`, `:31-32`): sorted `ushort[294]`, `Array.BinarySearch`.
- Events (`EventData.cs:8`, `:118`, `:228`): sorted `DayOffsets` `ushort[1671]`, `SliceStart`
  `ushort[1672]` (one sentinel) into `Entries` `ushort[3032]` of string-pool indices. Lookup is a
  binary search (`:422-423`), then the slice `[SliceStart[i], SliceStart[i + 1])`.
- String pool (`CalendarStrings.cs:7`): `(string Np, string En)[]` with 755 entries, the 32 tithi
  names first (indices 0 to 31), then event names. The strings themselves sit in the DLL's user
  string heap (69,416 bytes, which also holds the error messages and parser words).

All the `ushort` and `byte` arrays are compiled as raw data blobs (8 field RVAs in the DLL; the
seven patro arrays above are 22,044 bytes together), so they cost almost nothing at start-up. The
first `GetCalendarInfo` took 7 ms in the same scratch program, which includes the string pool's
static constructor.

## 5. What allocates and why

| Call | Allocates | Source | Measured |
|---|---|---|---|
| any constructor, conversions, `AddDays`, `AddMonths`, `TryParse` | nothing | | B1 to B4, B6: 0 bytes |
| `TithiNp`, `TithiEn`, `IsPublicHoliday` | nothing (strings come from the pool) | `Core/Calendar/CalendarBridge.cs:61-92` | not benchmarked alone |
| `EventsNp`, `EventsEn` | a new `string[]` per call when the day has events | `CalendarBridge.cs:107`, `:126` | |
| `GetCalendarInfo` | two new `string[]` (Nepali and English) when the day has events; a shared empty array otherwise | `CalendarBridge.cs:44-45` | B7: 51 bytes/op average |
| `ToLongDateUnicodeString(displayDayName: true)` | seven objects: year string, day string, `"{month} {day}"`, `+= ", {year}"`, `"{weekday}, {...}"`, a `char[]` for digit conversion and the final string | `Abilities/Formattable.cs:23-45`, `:64`, `:70-79` | B5: 435 bytes/op, 208 ns |
| `ToString()` | a `char[10]` and the string | `Formattable.cs:110-119` | |

`CalendarInfo` itself is a `readonly struct` (`Core/Calendar/CalendarInfo.cs:8`) holding two
strings, a `bool` and two `string[]`, so only the arrays reach the heap. A `string[]` of `n`
entries is `24 + 8n` bytes on x64; summing `2 × (24 + 8n)` over the 41 B7 inputs that have
events gives 51.25 bytes per operation, which is the measured 51 B. Month and weekday names come
from enum `ToString()` (cached by the runtime) and a `Dictionary<string, string>` lookup
(`Core/Dictionaries/Unicodes.cs:8`), so they don't allocate; the interpolations around them do.

## Lessons for the ports

1. **Copy: table lookup, no search, for conversions.** NepDate's speed on B1 and B2 comes from one
   array read per conversion plus a short fix-up. The serial model of ALGORITHM §4 gets the same
   O(1) shape with a binary search over 300 `YEAR_START` entries (9 comparisons) or, faster, a
   per-month cumulative table; ports benchmark both.
2. **Copy: primitive arrays as constant data.** Every NepDate table that is a primitive array costs
   nothing at start-up. Ports put every table in the platform's equivalent of read-only static data
   (Rust `static`, C++ `constexpr`, Go package-level arrays of fixed size, Kotlin/Java a `String`
   or resource decoded once, not a giant `<clinit>`).
3. **Do better: no array of records built in code.** NepDate's tuple tables cost 188 KB of IL and
   about 69 ms on first use. Ports keep tables as primitive arrays (struct of arrays), or packed
   integers, so they compile to data, not code.
4. **Do better: smaller tables.** The three NepDate copies of the month lengths take about 117 KB
   at run time. ALGORITHM §2 needs `PACKED` (299 × 4 bytes) and `YEAR_START` (300 × 4 bytes),
   about 2.4 KB, and serves BS to AD, AD to BS and the patro day index alike.
5. **Do better: a 4-byte date.** NepDate's date is 32 bytes because it caches the AD date. A port
   stores the serial (or packed y/m/d) in 4 bytes and computes AD on demand; ALGORITHM §5 makes
   that a few integer operations.
6. **Do better: validate once.** NepDate's constructor reads the same table entry twice, `TryParse`
   validates three times and `AddMonths` builds a throwaway date for a month length. Ports validate
   once and read month lengths directly.
7. **Do better: tithi by subtraction.** Tithi data is contiguous (PATRO §3), so the lookup is
   `serial - first` and one byte read, not a binary search over 2190 entries.
8. **Do better: patro lookups without allocation.** Return event names as a borrowed slice, view or
   iterator over the static pool (Rust `&'static [Event]`, C++ `std::span`, Go a sub-slice, Kotlin
   or Java an index-based view), never a new array per call. Target for B7: 0 bytes.
9. **Do better: formatting into a caller buffer.** B5 is the slowest core operation at 208 ns and
   435 bytes because of seven intermediate strings. Ports write the long format in one pass into a
   stack or caller-supplied buffer and allocate at most the final string.
10. **Keep: one shared string pool.** Deduplicated (Nepali, English) pairs indexed by small
    integers (`byte` for tithi, `ushort` for events) are the right layout; ports keep it.
