# Contributing

This repository is the hub of the NepDate ports (ADR-0001): data, specs, vectors and Python tools.
Every change here reaches every port, so changes are small and exact. Agents also follow
[`AGENTS.md`](AGENTS.md).

## Data changes go upstream first

Calendar data comes from C# [NepDate](https://github.com/RajuPrasai/NepDate) through the weekly
sync (ADR-0002 §6). To fix a wrong month length, holiday or tithi, send the fix to NepDate first.
A hand edit here is only for a fix that can't wait, with an official source:
[`docs/runbooks/data-update.md`](docs/runbooks/data-update.md) says how. If you only want to report
a wrong date, open a "Data error" issue.

## Behaviour changes need an issue first

A change to `spec/`, to a vector or to the deviations in `spec/PARITY.md` changes every port. Open a
"Spec question" issue and wait for the maintainer's answer before the PR. Never weaken or delete a
vector to make a check pass.

## Checks

Python 3.10 or later, standard library only (no `pip install`). Before a PR:

```bash
./scripts/ci.sh
```

The last line reads `ci: <n> checks passed`. CI runs the same script.

## Commits and PRs

- [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, with
  scopes `data`, `spec`, `tools` or `ci`, and the task ID first when there is one
  (`feat(tools): H1-02 data status report`).
- One task per PR. Fill in the PR template.
- Prose, comments and commit messages follow
  [`.claude/skills/writing-style/SKILL.md`](.claude/skills/writing-style/SKILL.md): no em dashes,
  no filler, exact numbers and IDs, and no AI attribution lines.

By contributing you agree that your contribution is licensed under the MIT license
([LICENSE](LICENSE)) and that you follow the [Code of Conduct](CODE_OF_CONDUCT.md).
