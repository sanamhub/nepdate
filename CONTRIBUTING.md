# Contributing

Fixes and reports are welcome. Every change here reaches every NepDate port, so changes are small
and exact.

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). Report security problems as
described in [SECURITY.md](SECURITY.md), not in a public issue.

## Scope

A bug in one port's code goes to that port's repository. This repository takes changes to the
data, the spec, the vectors and the Python tools.

**Data goes upstream first.** Calendar data comes from C# [NepDate](https://github.com/RajuPrasai/NepDate)
(ADR-0002). To fix a month length, holiday or tithi, send the fix to NepDate. A hand edit here is
only for a fix that can't wait, with an official source; [`docs/runbooks/data-update.md`](docs/runbooks/data-update.md)
says how. To report a wrong date without a fix, open a "Data error" issue.

**Behaviour changes need an issue first.** A change to `spec/`, a vector or a deviation in
`spec/PARITY.md` changes every port. Open a "Spec question" issue and wait for the maintainer's
answer before the pull request. Never weaken or delete a vector to make a check pass.

## Checks

Python 3.10 or newer, standard library only:

```bash
./scripts/ci.sh
```

The last line reads `ci: <n> checks passed`, followed by `, <k> skipped (<names>)` when a check
could not run (workflow lint needs [actionlint](https://github.com/rhysd/actionlint)). A skipped
check is never counted as passed. CI runs the same script.

## Workflows

These rules apply to every workflow here and in the ports, and `tools/tests/test_workflows.py`
checks them:

- Every `uses:` is pinned to a full commit SHA with the version in a comment.
- Top-level `permissions: contents: read`, raised per job only where needed.
- Secrets are passed by name, never `secrets: inherit`. No `pull_request_target`.
- A job that builds or runs upstream code gets no secrets and no write permission.

## Pull requests

- One change per pull request. Fill in the template.
- Add a test in `tools/tests/` for a tool change.
- Add a line to the `Unreleased` section of [CHANGELOG.md](CHANGELOG.md) when a port would notice.
- A decision that binds every port gets an ADR in `docs/adr/`. Accepted ADRs are not edited; a
  later ADR supersedes an earlier one.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, imperative,
lower case, no trailing period. Scopes: `data`, `spec`, `tools`, `ci`. The body says why, not
what.

By contributing you agree that your contribution is licensed under the MIT license
([LICENSE](LICENSE)).
