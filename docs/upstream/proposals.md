# Proposals for upstream NepDate (C#)

Drafts of issues for [RajuPrasai/NepDate](https://github.com/RajuPrasai/NepDate), checked against
commit `cb05cb65` (2026-06-04) and the NuGet package 2.0.7. Each is discussed with the NepDate
author first, then sent as one PR per issue (ADR-0002, upstream first).

Order: U-01, U-02 and U-05 are safe patch fixes (2.0.8). U-04 is a question to answer before any
NepDate app ships events, and U-08 and U-09 go with it. U-06 can go in 2.x if the API doesn't change. U-03 was declined by the
author on 2026-10-07 (events stay in the one C# package); the ports split them anyway (ADR-0004,
PARITY D-13).

## Size of `lib/net8.0/NepDate.dll` (397,312 bytes)

Measured by building the Release DLL with parts of the data emptied.

| Part | Bytes | Share |
|---|---|---|
| Conversion tables (`EnglishToNepali.cs`, `NepaliToEnglish.cs`, 3589 and 3588 entries) | 187,904 | 47 % |
| Metadata (`TithiData`, `HolidayData`, `EventData`, `CalendarStrings`) | 103,936 | 26 % |
| Icon embedded by `<ApplicationIcon>` | 50,176 | 13 % |
| Everything else (code) | 55,296 | 14 % |

The metadata tables are only initialised when first used, so their cost is size and API surface, not
start-up time.

## U-01 Bug: `NewtonsoftJsonConverters` throws `FileNotFoundException`

`NepDate.csproj` references `Newtonsoft.Json` with `PrivateAssets="all"`, so the package declares no
dependency, but `NepDate.Serialization.NewtonsoftJsonConverters.NepaliDateJsonConverter` is public
and derives from a Newtonsoft type.

Repro (net8.0 console, `NepDate` 2.0.7 only):

```csharp
var c = new NepDate.Serialization.NewtonsoftJsonConverters.NepaliDateJsonConverter();
// System.IO.FileNotFoundException: Could not load file or assembly 'Newtonsoft.Json, Version=13.0.0.0'
```

Fix in 2.x: declare the dependency only if keeping the type; better, move it to its own package
(U-03). `System.Text.Json` is undeclared the same way; on `netstandard2.0` it isn't part of the
framework (a quick .NET Framework 4.8 test of reading the attribute didn't fail, so this one is
lower risk).

## U-02 Bug: the NuGet icon is copied into every consumer's project

`<Content Include="Assets\nuget-icon.ico" />` packs the icon as a content file
(`contentFiles/any/*/Assets/nuget-icon.ico`), so every project that references NepDate gets an
`Assets\nuget-icon.ico` item. `<ApplicationIcon>` on a class library also embeds the icon in the DLL
(50 KB, 13 % of its size). Fix: remove both; keep `<PackageIcon>`, which is the only one NuGet needs.

## U-03 Proposal: split the package (declined 2026-10-07, kept for the record)

Today one package holds conversion, formatting, parsing, fiscal year, ranges, bulk conversion,
tithi, holidays, events, two JSON libraries' converters, XML serialization and a `TypeConverter`.
Most users only convert dates.

| Package | Contents | Depends on |
|---|---|---|
| `NepDate` | `NepaliDate`, conversion, formatting, parsing, fiscal year, ranges, `TypeConverter`, `System.Text.Json` converter (in-box on .NET 8+) | nothing on net8.0; `System.Text.Json` on netstandard2.0 |
| `NepDate.Events` | tithi, public holidays, events (`CalendarInfo`, `GetCalendarInfo()`) | `NepDate` |
| `NepDate.Newtonsoft` | the Json.NET converter | `NepDate`, `Newtonsoft.Json` |

This is the usual .NET layout (NodaTime with `NodaTime.Serialization.JsonNet`; the
`Microsoft.Extensions.*` family). It also lets the event data, which changes every year, ship on its
own cadence.

Breaking changes: `TithiNp`, `TithiEn`, `IsPublicHoliday`, `EventsNp`, `EventsEn` and
`GetCalendarInfo()` leave `NepaliDate`. In `NepDate.Events` they become extension methods, and
extension properties for C# 14 callers, so most call sites only need the new package and a `using`.

## U-04 Question: where does the tithi, holiday and event data come from?

`NepDate.sln` lists four projects under `tools/` that generate the metadata, but `/tools` is in
`.gitignore`. Consequences:

- `dotnet build NepDate.sln` fails on a fresh clone (MSB3202, 4 projects not found).
- Nobody else can regenerate or check the generated `*Data.cs` files.
- The source and licence of the tithi, holiday and event data are not recorded, so the ports can't
  say what they redistribute.

Ask: where the data came from, under what terms, and whether the generator and its input can be
published. If the terms don't allow redistribution, rebuild the metadata from primary sources: the
government's public holiday notice and the Nepal Panchanga Nirnayak Samiti's panchang. A longer-term option is for NepDate to
generate its C# files from the hub's `data/` JSON, giving one reviewed source for every language.

## U-05 Docs: metadata range

The changelog (2.0.0, 2.0.7) and the XML docs on `CalendarInfo` say metadata covers BS 2001–2089.
The data covers BS 2077-01-01 to 2084-08-20; 2001–2089 is the range of `CalendarOffsets`. Fix the
wording, and say what callers get outside the data (empty values).

## U-06 Proposal: compact conversion tables (3.0, or 2.x if no API change)

The two dictionaries store a full date for each of 3589 months in both directions (188 KB compiled).
A table of month lengths (3588 bytes) and a table of month-start day numbers, as in the hub's
`spec/ALGORITHM.md`, give the same O(1) BS to AD conversion and binary-search AD to BS in a few KB.
Condition: the existing BenchmarkDotNet suite shows no slowdown, and the exhaustive check
(`tools/csharp-exhaustive` in the hub) shows all 109,212 days unchanged.

## U-07 Data: BS 2087 has 367 days and 2090 has 364

Already recorded in `data/README.md` ("Known data questions"). Raise with the same evidence.

## U-08 Data: BS 2084 New Year is named "New Year 2083"

The event on 1 Baishakh 2084 reads "नयाँ वर्ष २०८३" / "New Year 2083". In `CalendarStrings.cs`
the pool has one entry for it (`[722]`), and `EventData.cs` points both 2083-01-01 and 2084-01-01
at that entry, so the name was most likely copied in the data source before generation.
`CalendarStrings.cs` is generated by `CalendarDataGenerator` and says "Do not edit", so a PR that
edits it is overwritten by the next regeneration.

Ask: fix the name in the source and regenerate, or say whether a PR to the generated files is
welcome until the generator is published (U-04). Expected after the fix: a new pool entry
"नयाँ वर्ष २०८४" / "New Year 2084" used only by 2084-01-01. While checking, the AD New Year
entries are named two ways ("सन् २०२४ आरम्भ" for 2024, "नयाँ वर्ष २०२५" for 2025 and 2026); one form
would avoid confusing them with the BS New Year. The hub's `tools/data_sanity.py` (`new-year-name`)
flags the 2084 name and will go quiet once the fix is synced.

Sent as [RajuPrasai/NepDate#26](https://github.com/RajuPrasai/NepDate/pull/26) on 2026-10-18
(edits the generated files, adds a test for 2083 and 2084, and notes the generator source).

## U-09 Question: what does `*` / "(K)" on a tithi name mean?

`CalendarStrings.cs` has 16 tithi names that end in `*`, and their English names end in "(K)", for
example `("तृतिया*", "Tritiya (K)")` at `[16]`. Nothing in the repository explains either mark. In
the hub data, 152 of the 2190 tithi days carry it, all in BS 2078 to 2081, none in 2082 or 2083.

It does not look like a skipped (kshaya) tithi. Compared with the day before, 117 starred days are
simply the next tithi, 22 follow a skipped tithi and 3 repeat one, while 56 skips and 49 repeats
have no mark. For example 2078-01-31 is `तृतिया*` and 2078-02-01 is a plain `तृतिया`.

Ask: what the mark means and where it comes from (likely the same source as U-04), and whether
2082 onward should have it too. Until then the hub's `spec/PATRO.md` tells ports to show the name
unchanged.

## Effect on the hub

`tools/extract_from_csharp.py` reads upstream's generated C# files. When U-03 or U-06 moves or
reshapes them, the extractor changes in the same week, and the exhaustive check must still show
zero differences before the hub syncs.
