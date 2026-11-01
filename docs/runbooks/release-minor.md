# Runbook: release day for a minor version

Decided in ADR-0007. A minor version releases every SDK on the same day, so the line moves in one
hub pull request before any port releases. A patch release does not use this runbook: one port
bumps its own manifest, releases, and then its entry in `spec/versions.json` is updated, which
redeploys nepdate.com.

## Before the hub pull request

- [ ] Every spec change this minor carries has merged in every port. A change one language cannot
      implement yet blocks the minor for all of them, or the spec marks it optional for this
      release (ADR-0007, Consequences).
- [ ] Each port's changelog has its `Unreleased` section ready. A port with no change gets the line
      "No change in this port; released to keep every SDK on one version."
- [ ] Pick the pre-release suffix, `-beta.N` for the first public builds or `-rc.N` for a release
      candidate. The same suffix goes in every SDK (ADR-0007 decision 4).

## The hub pull request

- [ ] In `spec/versions.json`, set `line` to the new `MAJOR.MINOR`, for example `0.2`. Leave the
      `sdks` entries on the versions each port has released: an entry may trail the line, never
      lead it, and the site shows the entries, so it never names a version a registry does not
      serve yet.
- [ ] Run `py tools/version_line.py --check` and `./scripts/ci.sh`.
- [ ] Merge the pull request. No port releases before this merge.

## Each port

For Rust, Go, TypeScript, Python, Swift, Kotlin, C++ and C, in any order:

- [ ] Open or update the port's `shared/` sync PR. It brings the new `spec/versions.json`, and the
      port's `shared-check` fails until its own version is on the new line. That failure is the
      intended reminder.
- [ ] In the same PR, bump the port's manifest and changelog to the new version, for example
      `0.2.0-beta.1`: the Cargo workspace, the core `package.json`, `pyproject.toml`,
      `gradle.properties`, the CMake `project(VERSION)` or the Conan recipe, and the C CMake or
      `build.zig.zon`. The core and the patro of one port carry the same version (ADR-0004
      decision 3).
- [ ] Run the port's full CI command until it passes, then merge the PR.
- [ ] Release with the port's own release workflow, after its approval gate.
- [ ] Tag and name the version as ADR-0007 decision 4 says. Go, TypeScript, Kotlin, C and C++ tags
      start with `v` (`v0.2.0-beta.1`), the Swift package tag has no `v` (`0.2.0-beta.1`), and PyPI
      receives the PEP 440 spelling (`0.2.0b1`). The Rust release workflow still listens for
      `nepdate-v*`; ADR-0007 moves its next tags to the plain `v` prefix, so change that pattern
      before the first `v` tag.
- [ ] Once the release is on the registry, update that port's entry in `spec/versions.json` in a
      hub PR (several ports may share one PR). Merging it redeploys nepdate.com with the new
      install lines.

## After the releases

- [ ] `py tools/version_line.py --check` lists no port as "not yet released" on the new line.
- [ ] Open the site's Versions page and check each version, including the Python spelling.
