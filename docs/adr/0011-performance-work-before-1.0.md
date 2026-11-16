# ADR-0011: Performance work lands between 1.0.0-rc.1 and 1.0.0

- **Status:** accepted
- **Date:** 2026-11-16
- **Approved by:** Sanam
- **Amends:** [ADR-0009](0009-what-1.0-promises.md) decision 4, for the 1.0.0 release only

## Context

ADR-0009 decision 4 lets only fixes found during the release candidate land between `1.0.0-rc.1`
and `1.0.0`. A performance review of every port after `1.0.0-rc.1` found slow paths in five of
them, and the changes were merged on 2026-11-16: Dart, PHP, C, Java and Kotlin. Zig takes the C
change with its next vendored C core.

These changes are not fixes in the sense of decision 4, so the rule as written asks for either a
second release candidate or a wait until 1.1. Each change is internal:

- no row of `spec/API.md` changes, and no public name, signature or error changes;
- every shared vector still passes, and each port added a test that compares the new path with
  the old answer over every supported day or every input shape;
- each port's full gate passed before the merge, including mutation and coverage gates where the
  port has them.

## Decision

1. **The performance changes merged on 2026-11-16 ship in `1.0.0`** without a second release
   candidate.
2. **This is a one-time exception.** ADR-0009 decision 4 stands for every later release
   candidate: only fixes land between a release candidate and its stable release.
3. **Each port's changelog lists the change under `1.0.0`**, so a user who tested `1.0.0-rc.1`
   can see what differs.
4. **Published benchmark figures are measured again on the idle reference machine before
   `1.0.0`**, so the numbers on the site and in each port describe the code that ships.

## Consequences

- `1.0.0` is not byte-for-byte the release candidate in five ports. The difference is internal
  and is covered by exhaustive tests, not by time spent as a release candidate.
- Users get the faster code in the first stable release, and no port ships a `1.0.1` or `1.1.0`
  days after `1.0.0` only to carry it.
- The rule for later releases is unchanged, so this ADR does not make the release-candidate
  window a place for features.

## Alternatives considered

- **Release `1.0.0-rc.2` in every port:** it follows the rule, but ADR-0007 would move thirteen
  SDKs through another release candidate for changes that touch five and change no behaviour.
- **Hold the changes for 1.1:** `1.0.0` would ship code already known to be slower, and the
  merged work would have to be reverted in five repositories and merged again.
