# nepdate

Shared data and specification for the NepDate family of Bikram Sambat (Nepali calendar)
libraries. There is no library code here. This repository holds what has to be identical in every
language: the calendar data, the spec, the conformance vectors, and the import from the C#
[NepDate](https://github.com/RajuPrasai/NepDate) library.

Supported range: BS 1901-01-01 to 2199-12-30 (AD 1844-04-11 to 2143-04-15). Tithi, holidays and
events cover BS 2077 to 2084, with tithi until 2083-12-30.

## Ports

| Language | Repository | Status |
|---|---|---|
| C# (upstream) | [RajuPrasai/NepDate](https://github.com/RajuPrasai/NepDate) | released |
| Rust, plus the MitiBar desktop widget | [sanamhub/nepdate-rust](https://github.com/sanamhub/nepdate-rust) | 0.1.0 ready, not published |
| Go | [sanamhub/nepdate-go](https://github.com/sanamhub/nepdate-go) | 0.1.0 ready, not published |
| TypeScript and JavaScript | [sanamhub/nepdate-typescript](https://github.com/sanamhub/nepdate-typescript) | 0.1.0 ready, not published |
| Python | [sanamhub/nepdate-python](https://github.com/sanamhub/nepdate-python) | 0.1.0 ready, not published |
| Swift | [sanamhub/nepdate-swift](https://github.com/sanamhub/nepdate-swift) | 0.1.0 ready, not published |
| Kotlin and Java | [sanamhub/nepdate-kotlin](https://github.com/sanamhub/nepdate-kotlin) | 0.1.0 ready, not published |
| C++ | [sanamhub/nepdate-cpp](https://github.com/sanamhub/nepdate-cpp) | 0.1.0 ready, not published |

The Android and iOS apps live in [sanamhub/nepdate-mobile](https://github.com/sanamhub/nepdate-mobile)
and are in development.

Every port ships two packages: the core (conversion, arithmetic, formatting, parsing) and the
patro (tithi, holidays, events). Names follow each ecosystem; see
[ADR-0004](docs/adr/0004-patro-in-a-separate-package.md).

## How the ports use this repository

Each port keeps a read-only copy of `data/` and `spec/` in its own `shared/` directory, with the
hub commit in `shared/VERSION`, and generates constant tables from it at build time. A check in
each port fails if `shared/` drifts from the hub
([ADR-0001](docs/adr/0001-hub-and-spoke-repositories.md)).

Calendar data comes from C# NepDate first, then here, then the ports
([ADR-0002](docs/adr/0002-canonical-data-and-upstream-first.md)). Report a wrong date, holiday or
tithi with the "Data error" issue form.

```
data/            calendar and patro data (JSON), NOTICE
spec/            algorithm, formatting, parsing, patro, parity, vectors, reference checker
tools/           C# importer, golden vector generator, data checks
docs/adr/        decisions that bind every port
docs/runbooks/   data updates and syncing
```

## Check the spec and data

Python 3.10 or newer, nothing else:

```bash
py spec/reference/verify_vectors.py
```

It checks the algorithm spec against 7176 month-boundary vectors and 20,360 golden rows (dates,
add days, add months) recorded from C# NepDate, plus the formatting and parsing specs.

## Credits and license

Calendar data and algorithm come from [NepDate](https://github.com/RajuPrasai/NepDate) by Raju
Prasai and contributors, MIT, used with the author's agreement ([data/NOTICE](data/NOTICE)). This
repository is MIT ([LICENSE](LICENSE)). Not affiliated with the Government of Nepal; holiday data
is informational.
