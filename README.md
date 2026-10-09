# nepdate

Shared data and specification for the NepDate family of Bikram Sambat (Nepali calendar)
libraries. This repository holds no library code. It holds what must be identical in every
language: the calendar data, the normative spec, the conformance vectors, and the sync from
the original C# [NepDate](https://github.com/RajuPrasai/NepDate).

## Ports

| Language | Repository | Status |
|---|---|---|
| C# (upstream) | [RajuPrasai/NepDate](https://github.com/RajuPrasai/NepDate) | released |
| Rust (library + desktop widget) | `sanamhub/nepdate-rust` | planned |
| Go | `sanamhub/nepdate-go` | planned |
| TypeScript / JavaScript | `sanamhub/nepdate-typescript` | planned |
| Python | `sanamhub/nepdate-python` | planned |
| Swift (iOS, macOS, Linux) | `sanamhub/nepdate-swift` | planned, for the iOS app |
| C++ | `sanamhub/nepdate-cpp` | planned |
| Kotlin and Java (JVM, Android) | `sanamhub/nepdate-kotlin` | planned, next (for the Android app) |
| Others | `sanamhub/nepdate-<lang>` | later, same template |

Apps built on the ports: `sanamhub/nepdate-mobile` (native Android and iOS calendar with widgets,
planned) and the desktop widget in `nepdate-rust`.

Each port vendors `data/` and `spec/` into its own `shared/` and gets a sync PR every week
([ADR-0001](docs/adr/0001-hub-and-spoke-repositories.md)).

Supported range: **BS 1901-01-01 to 2199-12-30** (AD 1844-04-11 to 2143-04-15).
Metadata (tithi, holidays, events): BS 2077 to 2084, tithi until 2083-12-30.

Each port ships a core package and a separate patro package (tithi, holidays, events; names per
language in ADR-0004)
([ADR-0004](docs/adr/0004-patro-in-a-separate-package.md)). Implementation order, the per-task
loop and the review checklist: [docs/handover.md](docs/handover.md).

## Layout

```
data/            canonical calendar data (JSON) + NOTICE
spec/            ALGORITHM, FORMATTING, PARSING, PATRO, PARITY + vectors/ + reference/verify_vectors.py
tools/           importer from C# NepDate, C# golden vector generator, vector and data-status scripts
docs/adr/        decisions that bind every port
docs/plan/       tasks for this repository
docs/runbooks/   data updates and syncing
```

## Check the spec and data

Needs Python 3.10+ and nothing else.

```bash
py spec/reference/verify_vectors.py
```

It checks the algorithm spec against 7176 month-boundary vectors, 20,360 golden rows (dates,
add days, add months) recorded from the C# NepDate library, and the formatting and parsing specs.

## Credits and license

- Calendar data and algorithm from [NepDate](https://github.com/RajuPrasai/NepDate) by Raju
  Prasai and contributors, MIT, ported with the author's agreement. See [data/NOTICE](data/NOTICE).
- This repository: MIT ([LICENSE](LICENSE)).
- Not affiliated with the Government of Nepal. Holiday data is informational.
