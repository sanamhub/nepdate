# Runbook: release day for a minor or major version

Decided in ADR-0007. A minor version releases every SDK on the same day, so the line moves in one
hub pull request before any port releases. A major version, and the stable release that follows a
release candidate, use the same steps. A patch release does not use this runbook: one port
bumps its own manifest, releases, and then its entry in `spec/versions.json` is updated, which
redeploys nepdate.com.

## A port that has not released yet

A port with no entry in `spec/versions.json` may pass a version on the current line or on a later
one, never an earlier one (ADR-0008). Do not add an entry for it: the entries are released versions
and the site shows them. Its `shared-check` is green while it is reviewed, and at the minor that
carries it the port releases on the new line and its entry is added like every other port's. After
that, the equality rule of ADR-0007 applies to it.

## Before the hub pull request

- [ ] Every spec change this minor carries has merged in every port. A change one language cannot
      implement yet blocks the minor for all of them, or the spec marks it optional for this
      release (ADR-0007, Consequences).
- [ ] Each port's changelog has its `Unreleased` section ready. A port with no change gets the line
      "No change in this port; released to keep every SDK on one version."
- [ ] Pick the pre-release suffix, `-beta.N` for the first public builds or `-rc.N` for a release
      candidate, or none for the stable release. The same suffix goes in every SDK (ADR-0007
      decision 4). Between a release candidate and its stable release only fixes land (ADR-0009).

## The hub pull request

- [ ] In `spec/versions.json`, set `line` to the new `MAJOR.MINOR`, for example `1.1`. Leave the
      `sdks` entries on the versions each port has released: an entry may trail the line, never
      lead it, and the site shows the entries, so it never names a version a registry does not
      serve yet.
- [ ] Run `py tools/version_line.py --check` and `./scripts/ci.sh`.
- [ ] Merge the pull request. No port releases before this merge.

## Each port

For every port that has released, in any order, and for a new port making its first release:

- [ ] Open or update the port's `shared/` sync PR. It brings the new `spec/versions.json`, and the
      port's `shared-check` fails until its own version is on the new line. That failure is the
      intended reminder.
- [ ] In the same PR, bump the port's manifest and changelog to the new version, for example
      `1.1.0-beta.1`. Each port's `docs/runbooks/release.md` names its manifests: the Cargo
      workspace, the `package.json` files, `pyproject.toml`, `gradle.properties` (Kotlin and
      Java), the CMake `project(VERSION)` with the Conan and vcpkg recipes (C++ and C),
      `pubspec.yaml`, `composer.json`, the Ruby `version.rb` files and `build.zig.zon`. The core
      and the patro of one port carry the same version (ADR-0004 decision 3).
- [ ] Run the port's full CI command until it passes, then merge the PR.
- [ ] Release with the port's own release workflow, after its approval gate.
- [ ] Tag and name the version as ADR-0007 decision 4 says. Every tag starts with `v`
      (`v1.1.0-beta.1`) except the Swift package tag, which has none (`1.1.0-beta.1`). PyPI
      receives the PEP 440 spelling (`1.1.0b1`) and RubyGems the Ruby one (`1.1.0.beta.1`);
      `tools/version_line.py` holds both mappings. Rust's older `nepdate-v*` tags stay as they
      are. The GitHub release is titled with the tag.
- [ ] If a port's tag shape changes, update the `production` environment's deployment tag rules in
      that repository too. A tag the rules do not match waits at the approval gate until it is added.
- [ ] Once the release is on the registry, update that port's entry in `spec/versions.json` in a
      hub PR (several ports may share one PR). Merging it redeploys nepdate.com with the new
      install lines.

## After the releases

- [ ] `py tools/version_line.py --check` lists no port as "not yet released" on the new line.
- [ ] Open the site's Versions page and check each version, including the Python and Ruby
      spellings.
- [ ] For a stable release, remove the release-candidate note from each language page of the
      site and the pre-release flags from its install lines (`site/src/data/ports.ts`).
