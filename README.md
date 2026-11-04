<p align="center">
  <img src="https://raw.githubusercontent.com/sanamhub/nepdate/main/assets/logo/nepdate-128.png" width="112" alt="NepDate logo">
</p>

<h1 align="center">NepDate</h1>

<p align="center">
  Bikram Sambat, the Nepali calendar, with the same answer in every language.
</p>

<p align="center">
  <a href="https://nepdate.com"><img src="https://img.shields.io/badge/docs-nepdate.com-c12b2b" alt="Docs: nepdate.com"></a>
  <a href="https://patro.nepdate.com"><img src="https://img.shields.io/badge/patro-patro.nepdate.com-3f6383" alt="Patro: patro.nepdate.com"></a>
  <a href="https://github.com/sanamhub/nepdate/actions/workflows/ci.yml"><img src="https://github.com/sanamhub/nepdate/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/sanamhub/nepdate/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License: MIT"></a>
</p>

NepDate converts between Bikram Sambat (BS) and Gregorian (AD) dates for BS 1901-01-01 to
2199-12-30 (AD 1844-04-11 to 2143-04-15), formats and parses them in English and Nepali, does date
arithmetic and fiscal years, and knows each day's tithi, public holidays and events. It started as
the C# [NepDate](https://github.com/RajuPrasai/NepDate) library and now has a port for thirteen more
languages. Every port is built from one dataset and one specification, and checked against the same
test vectors, so they all give the same day for the same date.

This repository is the hub: the data, the specification, the decisions that bind every port, and
the websites. The library code lives in each language's own repository.

## Languages

Each port ships two packages on one version line: the **core** (conversion, arithmetic, formatting,
parsing; no dependencies, no almanac data) and the **patro** (पात्रो: tithi, public holidays and
events). The API is stable from 1.0 ([ADR-0009](docs/adr/0009-what-1.0-promises.md)).

| Language | Core | Patro | Latest | Repository |
|---|---|---|---|---|
| C# | [`NepDate`](https://www.nuget.org/packages/NepDate) | in the same package | [![NuGet](https://img.shields.io/nuget/v/NepDate?logo=nuget&label=)](https://www.nuget.org/packages/NepDate) | [RajuPrasai/NepDate](https://github.com/RajuPrasai/NepDate) |
| TypeScript | [`nepdate-core`](https://www.npmjs.com/package/nepdate-core) | [`nepdate-patro`](https://www.npmjs.com/package/nepdate-patro) | [![npm](https://img.shields.io/npm/v/nepdate-core/rc?logo=npm&label=)](https://www.npmjs.com/package/nepdate-core) | [nepdate-typescript](https://github.com/sanamhub/nepdate-typescript) |
| Python | [`nepdate-core`](https://pypi.org/project/nepdate-core/) | [`nepdate-patro`](https://pypi.org/project/nepdate-patro/) | [![PyPI](https://img.shields.io/pypi/v/nepdate-core?include_prereleases&logo=python&logoColor=white&label=)](https://pypi.org/project/nepdate-core/) | [nepdate-python](https://github.com/sanamhub/nepdate-python) |
| PHP | [`sanamhub/nepdate`](https://packagist.org/packages/sanamhub/nepdate) | [`sanamhub/nepdate-patro`](https://packagist.org/packages/sanamhub/nepdate-patro) | [![Packagist](https://img.shields.io/packagist/v/sanamhub/nepdate?include_prereleases&logo=packagist&logoColor=white&label=)](https://packagist.org/packages/sanamhub/nepdate) | [nepdate-php](https://github.com/sanamhub/nepdate-php) |
| Java | [`io.github.sanamhub:nepdate-java`](https://central.sonatype.com/artifact/io.github.sanamhub/nepdate-java) | [`nepdate-java-patro`](https://central.sonatype.com/artifact/io.github.sanamhub/nepdate-java-patro) | [![Maven Central](https://img.shields.io/maven-central/v/io.github.sanamhub/nepdate-java?logo=apachemaven&label=)](https://central.sonatype.com/artifact/io.github.sanamhub/nepdate-java) | [nepdate-java](https://github.com/sanamhub/nepdate-java) |
| Dart | [`nepdate`](https://pub.dev/packages/nepdate) | [`nepdate_patro`](https://pub.dev/packages/nepdate_patro) | [![pub.dev](https://img.shields.io/pub/v/nepdate?include_prereleases&logo=dart&label=)](https://pub.dev/packages/nepdate) | [nepdate-dart](https://github.com/sanamhub/nepdate-dart) |
| Kotlin | [`io.github.sanamhub:nepdate`](https://central.sonatype.com/artifact/io.github.sanamhub/nepdate) | [`nepdate-patro`](https://central.sonatype.com/artifact/io.github.sanamhub/nepdate-patro) | [![Maven Central](https://img.shields.io/maven-central/v/io.github.sanamhub/nepdate?logo=apachemaven&label=)](https://central.sonatype.com/artifact/io.github.sanamhub/nepdate) | [nepdate-kotlin](https://github.com/sanamhub/nepdate-kotlin) |
| Go | [`nepdate`](https://pkg.go.dev/github.com/sanamhub/nepdate-go) | [`nepdate/patro`](https://pkg.go.dev/github.com/sanamhub/nepdate-go/patro) | [![Go](https://img.shields.io/github/v/tag/sanamhub/nepdate-go?include_prereleases&sort=semver&logo=go&label=)](https://pkg.go.dev/github.com/sanamhub/nepdate-go) | [nepdate-go](https://github.com/sanamhub/nepdate-go) |
| Swift | [`NepDate`](https://swiftpackageindex.com/sanamhub/nepdate-swift) | [`NepDatePatro`](https://swiftpackageindex.com/sanamhub/nepdate-swift) | [![SwiftPM](https://img.shields.io/github/v/tag/sanamhub/nepdate-swift?include_prereleases&sort=semver&logo=swift&label=)](https://github.com/sanamhub/nepdate-swift/releases) | [nepdate-swift](https://github.com/sanamhub/nepdate-swift) |
| C++ | `nepdate::nepdate` (CMake) | `nepdate::patro` | [![Release](https://img.shields.io/github/v/release/sanamhub/nepdate-cpp?include_prereleases&sort=semver&logo=cplusplus&label=)](https://github.com/sanamhub/nepdate-cpp/releases) | [nepdate-cpp](https://github.com/sanamhub/nepdate-cpp) |
| C | `nepdate-c::nepdate` (CMake) | `nepdate-c::patro` | [![Release](https://img.shields.io/github/v/release/sanamhub/nepdate-c?include_prereleases&sort=semver&logo=c&label=)](https://github.com/sanamhub/nepdate-c/releases) | [nepdate-c](https://github.com/sanamhub/nepdate-c) |
| Rust | [`nepdate`](https://crates.io/crates/nepdate) | [`nepdate-patro`](https://crates.io/crates/nepdate-patro) | [![crates.io](https://img.shields.io/crates/v/nepdate?include_prereleases&logo=rust&label=)](https://crates.io/crates/nepdate) | [nepdate-rust](https://github.com/sanamhub/nepdate-rust) |
| Ruby | [`nepdate`](https://rubygems.org/gems/nepdate) | [`nepdate-patro`](https://rubygems.org/gems/nepdate-patro) | [![RubyGems](https://img.shields.io/gem/v/nepdate?include_prereleases&logo=rubygems&label=)](https://rubygems.org/gems/nepdate) | [nepdate-ruby](https://github.com/sanamhub/nepdate-ruby) |
| Zig | `nepdate` (build.zig.zon) | `nepdate_patro` | [![Release](https://img.shields.io/github/v/release/sanamhub/nepdate-zig?include_prereleases&sort=semver&logo=zig&label=)](https://github.com/sanamhub/nepdate-zig/releases) | [nepdate-zig](https://github.com/sanamhub/nepdate-zig) |

Install lines with the exact version are in each repository's README and on
[nepdate.com](https://nepdate.com). A few names differ from the rest: the core is `nepdate-core`
on PyPI and npm, because `nepdate` is taken on PyPI and refused as too close to `nep-date` on npm
(in Python you still `import nepdate`). C++, C and Zig have no central registry and install from a
tagged release.

For web pages there is also [`nepdate-datepicker`](https://www.npmjs.com/package/nepdate-datepicker),
BS date picker web components that work in plain HTML and any framework
([docs](https://nepdate.com/docs/datepicker/)).

## Apps

| | |
|---|---|
| **[MitiBar](https://nepdate.com/mitibar/)** | Today's BS date in the tray and taskbar, with the month, tithi and holidays one click away. Windows, macOS and Linux. [Download](https://github.com/sanamhub/mitibar/releases/latest) |
| **[patro.nepdate.com](https://patro.nepdate.com)** | The Nepali calendar on the web: every month with tithi, holidays and events, a page for each day, and each year's holidays for your calendar app. Built from this repository's `patro/`. |
| **NepDate for Android and iOS** | Home-screen widgets and the month with tithi and holidays, with no ads, account or network. Coming soon, in [nepdate-mobile](https://github.com/sanamhub/nepdate-mobile). |

Tithi, holidays and events cover BS 2077 to 2084. They are informational, not an official calendar.

## How the ports stay identical

Each port keeps a read-only copy of `data/` and `spec/` in its own `shared/` directory, with the
hub commit it came from, and builds its tables from that copy. Its CI fails when the copy drifts
from the hub ([ADR-0001](docs/adr/0001-hub-and-spoke-repositories.md)) and runs the same vector
files as every other port.

Calendar data flows one way: the C# library first, then this hub, then every port
([ADR-0002](docs/adr/0002-canonical-data-and-upstream-first.md)). Report a wrong date, holiday or
tithi once, with the [data error form](https://github.com/sanamhub/nepdate/issues/new/choose); one
fix here reaches every language.

```
data/            calendar and patro data (JSON) and its NOTICE
spec/            algorithm, formatting, parsing, patro, parity, vectors, reference checker
tools/           importer, golden vector generator, data checks
docs/adr/        decisions that bind every port
docs/runbooks/   data updates, syncing and releases
site/            nepdate.com: landing page and docs
patro/           patro.nepdate.com
assets/logo/     the family logo and one per port
```

## Check the spec and data

Python 3.10 or newer, nothing else:

```bash
python spec/reference/verify_vectors.py
```

It checks the algorithm spec against 7,176 month-boundary vectors and 21,126 golden rows recorded
from C# NepDate, the 299-year reference year lengths, the formatting and parsing specs and the API
coverage. `scripts/ci.sh` runs that and the data checks, as CI does.

## Credits and license

The calendar data and the algorithm come from the C# [NepDate](https://github.com/RajuPrasai/NepDate)
library, MIT, used with its maintainers' agreement ([data/NOTICE](data/NOTICE)). This repository is
MIT ([LICENSE](LICENSE)). Not affiliated with the Government of Nepal.
