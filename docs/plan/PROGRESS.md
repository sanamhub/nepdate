# Progress (hub)

Tasks from [`00-ROADMAP.md`](00-ROADMAP.md), in the format of `docs/handover.md` §3 step 7. There is
no GitHub remote yet: "CI last line" is `./scripts/ci.sh` run locally, and GitHub-side tasks are
blocked on the human.

| Task | Status | Commit | CI last line | Notes and open questions |
|---|---|---|---|---|
| H0-01 | blocked | | | Human: create `sanamhub/nepdate`, push, branch protection on `main` (PR, 1 approval, CI green, no force-push), dependency graph, private vulnerability reporting. |
| H0-02 | done | ba58b88 | `ci: 2 checks passed` | `ci.yml` runs `scripts/ci.sh`, the local CI command (not in the plan; added so local and GitHub runs are the same). A corrupted `month-boundaries.csv` row makes it exit 1. "CI green on the first PR" waits for H0-01. |
| H0-03 | done | 1774313 | `ci: 2 checks passed` | `CODE_OF_CONDUCT.md` copied from `sanamhub/typesafe-dotnet` (Contributor Covenant 2.1, contact through the @sanamhub profile). Issue templates checked with a YAML parser; GitHub renders them only after H0-01. |
