# ADR-0007: One version line for every NepDate SDK

- **Status:** proposed
- **Date:** 2026-10-30
- **Approved by:** pending (Sanam)

## Context

Eight SDKs (Rust, Go, TypeScript, Python, Swift, Kotlin, C++ and C) each shipped `0.1.0-beta.1`
on their own tag. Nothing keeps them together after that. A user who reads "NepDate 0.2" on
nepdate.com should get the same API and the same calendar data in every language, and a bug
report that names a version should say which hub data and spec the port was built from without
anyone looking it up.

Two kinds of change reach the SDKs. A spec change (a new function, a new format token, a changed
rule) reaches every port, so every port releases. A fix in one port's code, or a packaging
change, reaches one port; forcing seven empty releases for it would put noise in seven changelogs
and registries.

Apps built on the SDKs are a different product with their own users and cadence. MitiBar already
has its own version (`1.0.0`) and repository, the mobile app will too, and the date picker is a UI
component, not an SDK.

Registries spell pre-releases differently. SemVer `0.1.0-rc.1` is valid on crates.io, npm, Maven
Central, Go module tags, Swift package tags, vcpkg and Conan. PyPI requires PEP 440, which writes
the same version `0.1.0rc1`.

## Decision

1. **`MAJOR.MINOR` is the same in every SDK at all times.** A new minor version releases every SDK
   on the same day. A port with no change in that minor still releases, and its changelog says
   "No change in this port; released to keep every SDK on one version."
2. **`PATCH` may differ.** A fix in one port releases a patch of that port only. A calendar data
   update from the hub (ADR-0002) is a patch in every port, released as each port merges its
   `shared/` sync.
3. **The hub records the line.** `spec/versions.json` holds the current `MAJOR.MINOR` line and each
   SDK's latest released version. Spokes vendor it with `spec/`. `shared-check` fails a port whose
   own version has a different `MAJOR.MINOR` from the line, so a port cannot drift by accident.
   The line moves in one hub pull request on release day, after which each port's sync pull
   request fails until that port is bumped, which is the intended reminder.
4. **Pre-releases use the same suffix everywhere**, SemVer form: `-rc.N` (and `-beta.N` for the
   first public builds). The one exception is spelled in this table:

   | Registry | `0.1.0-rc.1` is written |
   |---|---|
   | crates.io, npm, Maven Central, vcpkg, Conan | `0.1.0-rc.1` |
   | Go module and C, C++ tags | `v0.1.0-rc.1` |
   | Swift package tag | `0.1.0-rc.1` (the Swift port has always tagged without a `v`) |
   | PyPI | `0.1.0rc1` (PEP 440) |

   A new port adds its row here before its first release.
5. **The core and the patro of one port share a version** (ADR-0004 decision 3, unchanged).
6. **Outside this line:** C# NepDate (upstream, its own maintainers and version), apps (MitiBar,
   the mobile app) and UI components (the date picker). They name the SDK version they depend on
   in their changelog instead.

## Consequences

- A user can mix ports on one minor version and expect the same API, rules and data, which is what
  the site's language switcher already implies.
- Release day for a minor is eight releases. Each port keeps its own release workflow and
  approval; the hub runbook gets one checklist that lists them and the `spec/versions.json`
  update.
- The site reads each port's version from `spec/versions.json` instead of one `VERSION` constant
  in `site/src/data/ports.ts`, so a patch in one port shows correctly. Until that change lands,
  every port is on `0.1.0-beta.1` and the constant is still true.
- Tag names: a port's tags follow the table in decision 4. The Rust repository's older
  `nepdate-v*` tags (from when it also released the desktop app) stay as they are; its next tags
  use plain `v`.
- A spec change that one language cannot yet implement blocks the minor for every port, or the
  spec marks it optional for a release. This is deliberate: the line is a promise about the API.

## Alternatives considered

- **Every port fully independent:** the simplest to release, but "NepDate 0.3" stops meaning
  anything, and the site has to explain which port has which feature.
- **Full lockstep including `PATCH`:** one number everywhere, but every one-port fix becomes eight
  releases, seven of them empty.
- **Calendar-based versions (`2026.10`):** says when, not whether the API changed, and does not fit
  SemVer-based tools such as Cargo and npm ranges.
