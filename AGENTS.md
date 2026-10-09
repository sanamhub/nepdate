# AGENTS.md: rules for AI coding agents (hub)

This repository is the hub of the NepDate ports (ADR-0001). It contains data, specs, vectors
and Python tools, no library code. Every change here reaches every port, so be exact.

## 0. Before changing anything

1. Read `README.md`, this file, every ADR in `docs/adr/`, and `docs/plan/00-ROADMAP.md`.
2. Do one task ID at a time (`H1-02`). Check its preconditions; if one is unmet, stop and say so.

## 1. Sources of truth

1. `spec/*.md` + `spec/vectors/*`: behaviour. Vectors win over prose if they disagree (then
   report the disagreement).
2. `docs/adr/*`: decisions.
3. `data/*`: calendar data. It changes only through the upstream sync PR or a hand edit that
   follows `docs/runbooks/data-update.md`. Never as a side effect of another task.

Never use the C# NepDate docs (README/llms.txt) as a source: they are known to be wrong
(`spec/PARITY.md` §1). The C# code and the golden vectors are the reference.

## 2. Hard rules

- `py spec/reference/verify_vectors.py` passes before and after every change.
- A behaviour change (spec, vectors, a new deviation in `spec/PARITY.md`) needs the human's
  approval in the PR, because every port must then follow it.
- Python tools use the standard library only. No `pip install`.
- Don't weaken or delete a vector to make a check pass.
- Secrets never go in code, logs, or commits.
- Workflows (here and in every spoke): every `uses:` pinned to a full commit SHA with the version
  in a comment, including the hub's reusable workflows; top-level `permissions: contents: read`,
  raised per job only where needed; secrets passed by name, never `secrets: inherit`; never
  `pull_request_target`; a job that builds or runs upstream code gets no secrets and no write
  permission.

## 3. Writing

All prose follows [`.claude/skills/writing-style/SKILL.md`](.claude/skills/writing-style/SKILL.md),
for every agent. No em dashes, no filler, exact numbers and IDs, why-not-what in comments and
commit bodies, and **no AI attribution** in commits or PRs.
