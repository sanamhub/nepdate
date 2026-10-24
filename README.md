<p align="center">
  <img src="https://raw.githubusercontent.com/sanamhub/nepdate/main/assets/logo/nepdate-128.png" width="128" alt="NepDate logo">
</p>

<h1 align="center">nepdate</h1>

<p align="center">
  <a href="https://github.com/sanamhub/nepdate/actions/workflows/ci.yml"><img src="https://github.com/sanamhub/nepdate/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/sanamhub/nepdate/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License: MIT"></a>
</p>

Bikram Sambat (the Nepali calendar) for eight languages, and the shared data and specification
behind them. Every library converts between BS and AD for BS 1901-01-01 to 2199-12-30 (AD
1844-04-11 to 2143-04-15), gives the same answer as the others, and checks that against the same
test vectors. This repository holds no library code: it has what must be identical in every
language, imported from the C# [NepDate](https://github.com/RajuPrasai/NepDate) library.

Documentation for every language, and a converter: **[nepdate.com](https://nepdate.com)**.

Tithi, public holidays and events cover BS 2077 to 2084 (tithi until 2083-12-30). They are
informational, not an official calendar.

## Packages

Every port ships two packages, one version: the core (conversion, arithmetic, formatting, parsing)
and the patro (पात्रो: tithi, holidays, events), so an app that only converts dates carries no
almanac data ([ADR-0004](docs/adr/0004-patro-in-a-separate-package.md)). The first public
version of the ports is `0.1.0-beta.1`; the API can still change before 0.1.0.

| Language | Core | Patro | Version | Repository |
|---|---|---|---|---|
| C# (upstream) | [`NepDate`](https://www.nuget.org/packages/NepDate) | in the same package | [![NuGet](https://img.shields.io/nuget/v/NepDate?logo=nuget&label=)](https://www.nuget.org/packages/NepDate) | [RajuPrasai/NepDate](https://github.com/RajuPrasai/NepDate) |
| Rust | [`nepdate`](https://crates.io/crates/nepdate) | [`nepdate-patro`](https://crates.io/crates/nepdate-patro) | [![crates.io](https://img.shields.io/crates/v/nepdate?include_prereleases&logo=rust&label=)](https://crates.io/crates/nepdate) | [nepdate-rust](https://github.com/sanamhub/nepdate-rust) |
| Go | [`nepdate`](https://pkg.go.dev/github.com/sanamhub/nepdate-go) | [`nepdate/patro`](https://pkg.go.dev/github.com/sanamhub/nepdate-go/patro) | [![Go](https://img.shields.io/github/v/tag/sanamhub/nepdate-go?include_prereleases&sort=semver&logo=go&label=)](https://pkg.go.dev/github.com/sanamhub/nepdate-go) | [nepdate-go](https://github.com/sanamhub/nepdate-go) |
| TypeScript, JavaScript | [`nepdate-core`](https://www.npmjs.com/package/nepdate-core) | [`nepdate-patro`](https://www.npmjs.com/package/nepdate-patro) | [![npm](https://img.shields.io/npm/v/nepdate-core/beta?logo=npm&label=)](https://www.npmjs.com/package/nepdate-core) | [nepdate-typescript](https://github.com/sanamhub/nepdate-typescript) |
| Python | [`nepdate-core`](https://pypi.org/project/nepdate-core/) | [`nepdate-patro`](https://pypi.org/project/nepdate-patro/) | [![PyPI](https://img.shields.io/pypi/v/nepdate-core?logo=python&logoColor=white&label=)](https://pypi.org/project/nepdate-core/) | [nepdate-python](https://github.com/sanamhub/nepdate-python) |
| Swift | [`NepDate`](https://swiftpackageindex.com/sanamhub/nepdate-swift) | [`NepDatePatro`](https://swiftpackageindex.com/sanamhub/nepdate-swift) | [![SwiftPM](https://img.shields.io/github/v/tag/sanamhub/nepdate-swift?include_prereleases&sort=semver&logo=swift&label=)](https://github.com/sanamhub/nepdate-swift/releases) | [nepdate-swift](https://github.com/sanamhub/nepdate-swift) |
| Kotlin, Java, Android | [`io.github.sanamhub:nepdate`](https://central.sonatype.com/artifact/io.github.sanamhub/nepdate) | [`io.github.sanamhub:nepdate-patro`](https://central.sonatype.com/artifact/io.github.sanamhub/nepdate-patro) | [![Maven Central](https://img.shields.io/maven-central/v/io.github.sanamhub/nepdate?logo=apachemaven&label=)](https://central.sonatype.com/artifact/io.github.sanamhub/nepdate) | [nepdate-kotlin](https://github.com/sanamhub/nepdate-kotlin) |
| C++20 | `nepdate::nepdate` | `nepdate::patro` | [![Release](https://img.shields.io/github/v/release/sanamhub/nepdate-cpp?include_prereleases&sort=semver&logo=cplusplus&label=)](https://github.com/sanamhub/nepdate-cpp/releases) | [nepdate-cpp](https://github.com/sanamhub/nepdate-cpp) |

The core is `nepdate-core` on PyPI and npm: on PyPI `nepdate` belongs to an unrelated package, and
npm refuses it as too close to the existing `nep-date`. In Python you still `import nepdate`. Swift is
listed on the [Swift Package Index](https://swiftpackageindex.com/sanamhub/nepdate-swift) and added
with SwiftPM; C++ has no central registry, so use CMake `FetchContent` pinned to a tag. Install
lines, with the exact version, are in each repository's README and its GitHub release notes.

### Apps

| App | What it is | Where |
|---|---|---|
| MitiBar | Tray calendar for Windows, macOS and Linux, with a floating date bar on Windows, built on the Rust library | [0.1.0-beta.1](https://github.com/sanamhub/nepdate-rust/releases/tag/mitibar-v0.1.0-beta.1), unsigned pre-release |
| NepDate for Android and iOS | Month view, holidays, widgets; no ads, account or network | [nepdate-mobile](https://github.com/sanamhub/nepdate-mobile), in development |

## How the ports use this repository

Each port keeps a read-only copy of `data/` and `spec/` in its own `shared/` directory, with the
hub commit in `shared/VERSION`, and generates constant tables from it at build time. A check in
each port fails if `shared/` drifts from the hub
([ADR-0001](docs/adr/0001-hub-and-spoke-repositories.md)).

Calendar data comes from C# NepDate first, then here, then the ports
([ADR-0002](docs/adr/0002-canonical-data-and-upstream-first.md)). Report a wrong date, holiday or
tithi with the [data error form](https://github.com/sanamhub/nepdate/issues/new/choose); one fix
here reaches every port.

```
data/            calendar and patro data (JSON), NOTICE
spec/            algorithm, formatting, parsing, patro, parity, vectors, reference checker
tools/           C# importer, golden vector generator, data checks
assets/logo/     the family logo and one per port
docs/adr/        decisions that bind every port
docs/runbooks/   data updates and syncing
site/            nepdate.com: landing page and docs (ADR-0005)
```

## Check the spec and data

Python 3.10 or newer, nothing else:

```bash
py spec/reference/verify_vectors.py
```

It checks the algorithm spec against 7176 month-boundary vectors and 20,360 golden rows (dates,
add days, add months) recorded from C# NepDate, plus the formatting and parsing specs.
`scripts/ci.sh` runs that and the data checks, the same as CI.

## Credits and license

Calendar data and algorithm come from [NepDate](https://github.com/RajuPrasai/NepDate) by Raju
Prasai and contributors, MIT, used with the author's agreement ([data/NOTICE](data/NOTICE)). This
repository is MIT ([LICENSE](LICENSE)). Not affiliated with the Government of Nepal; holiday data
is informational.
