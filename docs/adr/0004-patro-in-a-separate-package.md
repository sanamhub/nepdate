# ADR-0004: Patro (tithi, holidays, events) in a separate package

- **Status:** accepted
- **Date:** 2026-10-07
- **Approved by:** Sanam

## Context

The data has two parts with different users and different release rhythms:

- The calendar (month lengths, BS 1901–2199): every user needs it; it changes rarely; compiled it is
  a few KB.
- The patro (पात्रो, the Nepali almanac): tithi, public holidays and events, BS 2077–2084 today.
  Calendar apps and widgets need it; most library users only convert dates; it changes every year;
  compiled it is about 100 KB, a quarter of the C# DLL (`docs/upstream/proposals.md`).

C# NepDate keeps both in one package, and its author prefers to keep it that way (2026-10-07).

"Events" was rejected as the name because the package also holds tithi and the holiday flag;
"panchang" because a panchang is only the astronomical part (tithi, nakshatra and so on) and has no
holidays; "almanac" because it is long and unfamiliar to the Nepali developers who are the main
users. "Patro" is what every Nepali calls exactly this; each README explains it in one line.

## Decision

1. Every port ships two units: the **core** and the **patro**. The patro depends on the core; the
   core never depends on, imports or contains anything from the patro.
2. Each unit is named by its ecosystem's own conventions:

   | Port | Core | Patro | Convention followed |
   |---|---|---|---|
   | C# (upstream, for reference) | `NepDate` | (in the same package) | NuGet PascalCase, dotted sub-packages |
   | Rust | crate `nepdate` | crate `nepdate-patro`, lib `nepdate_patro` | crates.io kebab case, Rust snake case paths |
   | C++ | vcpkg/Conan `nepdate`, CMake target `nepdate::nepdate`, namespace `nepdate` | vcpkg/Conan `nepdate-patro`, CMake target `nepdate::patro`, namespace `nepdate::patro`, header `<nepdate/patro.hpp>` | lowercase packages, `ns::target` CMake targets |
   | Go | package `github.com/sanamhub/nepdate-go` (name `nepdate`) | package `github.com/sanamhub/nepdate-go/patro` (name `patro`) | short lowercase package names; one module |
   | TypeScript | npm `nepdate` | npm `nepdate-patro` (`nepdate` as a peer dependency) | npm kebab case |
   | Python | distribution `nepdate-core` (`nepdate` on PyPI is an unrelated project), import `nepdate` | distribution `nepdate-patro`, import `nepdate_patro` | PEP 8 / PEP 423 |
   | Swift | product and module `NepDate` | product and module `NepDatePatro` | UpperCamelCase modules; one package |
   | Kotlin / Java | `io.github.sanamhub:nepdate`, package `io.github.sanamhub.nepdate` | `io.github.sanamhub:nepdate-patro`, package `io.github.sanamhub.nepdate.patro` | Maven kebab artifacts, lowercase packages |

   A future port picks the same way (Dart `nepdate_patro`, PHP `sanamhub/nepdate-patro` with
   namespace `NepDate\Patro`, Ruby gem `nepdate-patro` with `require "nepdate/patro"`).
3. Both units live in the same repository, share a version and are released together from one tag.
   The patro declares the core at the same minor version. A data update that only touches the
   patro still bumps both (patch).
4. The hub uses the same word: `data/patro/` and `spec/PATRO.md`. The JSON fields stay `tithi`,
   `holiday` and `events`, because those are what each field holds.
5. API: `spec/PATRO.md` §2 (`info`, `coverage`, `public holidays`), as functions that take a core
   date. Where the language allows extensions (Swift, Kotlin, C# 14), they may also appear as
   members on the date type, from the patro unit only. The type holding `coverage` and
   `public holidays` is named `Patro` where the language needs a type for it.

## Consequences

- A user who only converts dates downloads and links no patro strings. PORT-PLAN phase 4 checks
  it: the built core must not contain the string `World Day Against Human Trafficking`, an English
  event name longer than 15 bytes, so no compiler stores it inline in code. The patro artefact must
  contain it, so the check can't pass by accident.
- Each port's CI builds and tests the core on its own, without the patro.
- C# parity: PARITY D-13 records the difference; query results are identical.
- Apps (`nepdate-mobile`, the Rust widget) depend on both units.

## Alternatives considered

- **Keep the patro optional inside the core (Cargo feature, subpath, submodule):** the core package
  still carries the data in its download, and versions move together for no reason.
- **A separate repository `nepdate-patro-<lang>`:** independent cadence, but a second sync pipeline,
  CI and release flow per language for the same hub data.
- **Follow C# (one package):** simplest, and the author's choice for C#; rejected for the ports for
  size and cadence.
