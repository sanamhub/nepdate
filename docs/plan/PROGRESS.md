# Progress (hub)

Tasks from [`00-ROADMAP.md`](00-ROADMAP.md), in the format of `docs/handover.md` §3 step 7. There is
no GitHub remote yet: "CI last line" is `./scripts/ci.sh` run locally, and GitHub-side tasks are
blocked on the human.

| Task | Status | Commit | CI last line | Notes and open questions |
|---|---|---|---|---|
| H0-01 | blocked | | | Human: create `sanamhub/nepdate`, push, branch protection on `main` (PR, 1 approval, CI green, no force-push), dependency graph, private vulnerability reporting. |
| H0-02 | done | ba58b88 | `ci: 2 checks passed` | `ci.yml` runs `scripts/ci.sh`, the local CI command (not in the plan; added so local and GitHub runs are the same). A corrupted `month-boundaries.csv` row makes it exit 1. "CI green on the first PR" waits for H0-01. |
| H0-03 | done | 1774313 | `ci: 2 checks passed` | `CODE_OF_CONDUCT.md` copied from `sanamhub/typesafe-dotnet` (Contributor Covenant 2.1, contact through the @sanamhub profile). Issue templates checked with a YAML parser; GitHub renders them only after H0-01. |
| H0 checkpoint | ready for review | f72b99a | `ci: 2 checks passed` (clean clone) | H0-01 blocked on the human (GitHub repository and branch protection). |
| H0 light check | ok | | | |
| H1-01 | done | e9fdbfa | `ci: 4 checks passed` | `spec/reference/nepcal.py` holds the calendar functions; `verify_vectors.py` output is byte-identical to before and it runs from any directory and from a `shared/` layout (tests). |
| H1-02 | done | f555790 | `ci: 4 checks passed` | AC dates tested on a synthetic patro with the cb05cb65 end dates, so a data sync doesn't break the tests; the AC commands also give the stated results on the committed data. "Within 183 days" means fewer than 183 days left (2026-10-12 has exactly 183). |
| H1-03 | done | 9c87f18 | `ci: 4 checks passed` | Tested against a fake upstream checkout generated from `data/` (`tools/tests/fake_upstream.py`). Run twice on the real clone at cb05cb65: second run changes no file. The importer no longer writes `month-boundaries.csv` (one writer: `make_vectors.py`); `--commit` defaults to the clone's `HEAD`; C# string escapes are now unescaped. NOTICE keeps its date while the commit is unchanged. |
| H1-04 | done | e1ed40b | `ci: 5 checks passed` | Findings on current data: year-length 2087 and 2090, new-year 2088, all listed in `data/known-questions.json`. |
| H1 checkpoint | ready for review | 7ca3f5d | `ci: 5 checks passed` (clean clone, 31 tests) | none blocked |
