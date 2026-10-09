# ADR-0001: Hub-and-spoke repositories for NepDate ports

- Status: Accepted
- Date: 2026-09-25
- Deciders: Sanam Pakuwal

## Context

NepDate (C#) is being brought to Rust first, then Go, Java, TypeScript and Python. Every
port must give the same answer for the same date, and a data update (next year's holidays)
must reach every port. Each language has its own build tool, CI, package registry and
conventions: Go wants its module at a repository root, npm, PyPI, Maven Central and crates.io
each publish differently.

This is the same problem tzdata (one database, a loader per language) and Unicode CLDR (one
data repository, ICU4C/ICU4J/ICU4X in separate repositories) solve.

## Decision

1. **Hub:** this repository, `sanamhub/nepdate`. It owns everything that is the same in
   every language and contains no library code:
   - `data/`: canonical calendar data (ADR-0002).
   - `spec/`: normative behaviour, `PARITY.md`, conformance vectors, and the Python
     reference implementation `spec/reference/verify_vectors.py`.
   - `tools/`: the importer from C# NepDate and the C# golden vector generator.
   - The weekly upstream sync from C# NepDate (`docs/runbooks/data-update.md`).
   - Architecture decisions that bind every port (`docs/adr/`).
2. **Spokes:** one repository per language, named `nepdate-<language>` with the language's full
   name: `nepdate-rust` (Rust library + widget), `nepdate-go`, `nepdate-typescript`,
   `nepdate-python`, `nepdate-swift`, `nepdate-kotlin`. Apps get their own repository
   (`nepdate-mobile`). The package published to each registry is plain `nepdate` where the name is
   free (crates.io, npm, Maven Central artifact); the repository name never leaks into the package
   name. Each spoke has its own CI, releases, versioning and changelog, in that ecosystem's normal
   style.
3. **Spokes vendor the hub.** Each spoke keeps a read-only copy of the hub's `data/` and
   `spec/` in `shared/`, plus `shared/VERSION` holding the hub commit it came from.
   - Not a git submodule: contributors clone normally, tests run offline, and nothing breaks
     when someone forgets `--recursive`.
   - A spoke CI job re-downloads the hub at that commit and fails if `shared/` differs, so
     nobody edits it by hand.
   - A weekly job in each spoke updates `shared/` to the hub's `main`, regenerates its tables
     and opens a PR. The same few lines of workflow YAML in every spoke. Only the
     regenerate command differs.
4. **Each spoke generates its own tables** from `shared/data/` with a small generator in its
   own tooling (Rust: `cargo xtask codegen`; Go: `go generate`; and so on). Generated files are
   committed. No port parses JSON at runtime.
5. **Behaviour changes start here.** A spec change, a new deviation or a data change is a PR to
   this hub first, then flows to every spoke through its sync PR.

## Consequences

- A port's contributors only need that port's toolchain. Python is needed only in the hub.
- The table generator exists once per language (about 50 lines each). The shared vectors
  catch any difference between them.
- A data fix reaches users only after each spoke merges its sync PR and releases. That is
  the price of independent releases; the weekly sync keeps the delay short.
- The hub has no releases. `shared/VERSION` (a commit) is the version a spoke depends on.

## Alternatives considered

- **One repository with every language (monorepo):** one data PR updates every port, but
  mixed toolchains, CI and release flows in one place, and Go modules in subdirectories need
  `go/vX.Y.Z` tags. Rejected: too heavy for a small team.
- **Git submodule instead of vendoring:** a real, pinned link, but contributors trip over it
  and CI needs extra checkout options. Rejected.
- **Hub generates code for every language:** the hub would need to know every language's
  idioms and toolchain. Rejected.
- **Data inside C# NepDate as JSON, consumed by everyone including C#:** the best long-term
  end state (one source, no importer). Needs agreement with the NepDate maintainer; revisit
  with a new ADR.
