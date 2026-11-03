# ADR-0008: A port may declare a later line before its first release

- **Status:** accepted
- **Date:** 2026-11-03
- **Approved by:** Sanam
- **Amends:** [ADR-0007](0007-one-version-line-for-every-sdk.md) decision 3

## Context

ADR-0007 decision 3 says `spec/versions.json` records the line and each SDK's latest released
version, and `shared-check` fails a port whose version has a different `MAJOR.MINOR` from the line.
The file only lists ports that have released, because the site shows those versions and must not
name a version a registry does not serve yet.

A port that is built but has not released has no entry. Its manifest still names the version it will
publish, and that version may be on a later line than the hub's. The Java port is the first case: it
declares `1.0.0-rc.1` while the hub line is `0.2`, because it releases with the family at 1.0. Ruby
and Zig are next. `shared-check` rejects all of them, with `major.minor 1.0 is not the hub line 0.2`,
although nothing is wrong. Moving the line to 1.0 early would fail the ten ports that have released
on `0.2.0-rc.1`, so the line cannot move before the 1.0 release. Leaving the job red until release
day is worse: the first push of a new port is red, and the drift check does not run while the port is
being reviewed.

## Decision

1. **A port with no entry in `sdks` has never released.** It may declare a version on the current
   line or on a later line, never on an earlier one. `check_sdk` compares only the declared
   `MAJOR.MINOR` with the line for such a port.
2. **A port with an entry keeps the equality rule of ADR-0007 decision 3 exactly.** Its version must
   be on the line, and the entry may trail a line that moved first.
3. **Entries still record released versions only.** A new port is not added to `spec/versions.json`
   before its first release, so the site never names a version a registry does not serve.
4. **The first release adds the entry.** At the minor that carries the new port, the line moves, the
   port releases on the new line, and its `sdks` entry is added like every other port's. From then
   on rule 2 applies.

## Consequences

- An unreleased port's `shared-check` is green on its own `main` before the hub line moves, which is
  what every new port needs for its first push.
- A port that has released cannot slip behind or ahead of the line: rule 2 is unchanged.
- The check still catches an unreleased port that declares a version older than the line, which
  would mean it is built against a superseded line.
- An SDK name that is not in the file is treated as unreleased, because the file cannot tell a new
  port from a typo. The version expression is still validated, and adding the name to the file is a
  release step, so a typo is caught when the entry is added rather than by `shared-check`.
- The release runbook gains a short section for a port that has not released, and the existing
  line-move steps do not change.

## Alternatives considered

- **Move the line to the new port's line before its release:** the ten released ports fail
  `shared-check` until each one releases, which is the intended reminder on release day but not for
  weeks or months before it.
- **Skip `shared-check` for a port with no entry:** the port would get no version check at all, and
  a wrong early line would go unnoticed until release.
- **Allow any version for a port with no entry:** the check would no longer catch a port built
  against an older line, which is the failure it exists to prevent.
- **Add an `unreleased` list to `spec/versions.json`:** a second place to record a version, and the
  site and every tool would have to filter it; the absence of an entry already says the same thing.
