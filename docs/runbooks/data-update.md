# Runbook: calendar data updates and syncing

Decided in ADR-0001 §3 (spokes vendor the hub) and ADR-0002 §6 (upstream first).

**Why this matters:** tithi data ends at **BS 2083-12-30** (≈ 13 April 2027) and 2084 has 7
days of data. After that every port shows no tithi and no holidays. Nothing crashes, but apps
like the widget look broken. Month lengths beyond the officially published years are
projections carried over from NepDate.

## How data flows

```
nuget.org ───┐
             ├─(daily 03:15 UTC) upstream-sync.yml─► hub PR "chore(data): sync from NepDate <sha>"
                                                                           │ review, CI, merge
                                                                           ▼
                                                                 sanamhub/nepdate main
                                                                           │
            ┌───────────(Tue) shared-sync.yml in each spoke──────────┐
            ▼                                ▼                        ▼
   nepdate-rust PR "chore(shared): …"  nepdate-go PR …     nepdate-typescript, -python,
   shared/ + regenerated tables        (same workflow)      -swift, -kotlin PRs …
            │ review, CI, merge, patch release
```

Nothing is installed in the NepDate repository: the hub pulls from it, using the public clone
and the public NuGet feed.

## Hub: `upstream-sync.yml`

Runs every day at 03:15 UTC and on demand (*Actions → upstream-sync → Run workflow*). A run
clones NepDate with blob filtering, imports the data, and records five checks, each reported to
the assignee (`vars.SYNC_ASSIGNEE`, default the repository owner):

| Check | When it fires | What you get |
|---|---|---|
| Upstream data changed | NepDate `HEAD` differs from `data/UPSTREAM` and the re-import changes `data/` | a PR on branch `bot/upstream-sync` with the new data, regenerated vectors, the upstream commit list and every check's result. Re-runs update the same PR |
| Upstream code changed | commits touched NepDate files outside `Core/Dictionaries` | the "Upstream NepDate changed outside the data" issue, listing them |
| New NepDate release | nuget.org has a release newer than the one `tools/csharp-golden` pins | a comment on that same issue: consider regenerating the golden vectors |
| Data running out | `tools/data_status.py --strict` fails (under 183 days of tithi, holiday or event data left) | the "Data running out" issue with the end dates |
| Importer failed | the importer, or a check that validates its output, exits non-zero | the "Upstream NepDate import failed" issue with the error output |

When `HEAD` already equals `data/UPSTREAM`, the importer and the checks around it are skipped, so
a quiet day costs seconds: the code, release and data-running-out checks still run. A check the
run could not perform (nuget.org unreachable, for example) is recorded in the report and raises
nothing.

Everything a run learns leaves the check job as one artifact: `data/`, `spec/vectors/`, `report.md`
with every result, `results.json`, the PR body and one file per issue, kept 7 days. The second job
downloads that artifact, applies the data and opens the PR and the issues. It never checks out
the NepDate clone and runs nothing from it, so a commit message or a file name from upstream can
only ever appear as text. Because the check job builds NepDate's code, the second job also treats
the artifact as untrusted: it takes the PR title only in the form `chore(data): sync from NepDate
<sha>`, and opens issues only under the three titles above with the artifact's own body files.

Issues are labelled `upstream-sync` and assigned like the PR. A check that fires again comments
on its open issue only when the body would change, so it adds nothing on a day that repeats
yesterday's finding; the bodies carry end dates rather than "days left" for the same reason.

To run the same checks by hand, against a clone: `py tools/extract_from_csharp.py <clone>
--summary changes.md`, then `py tools/make_vectors.py`, `py spec/reference/verify_vectors.py`,
`py tools/compare_exhaustive.py <out-dir>` after `tools/csharp-exhaustive`, and `./scripts/ci.sh`.
`py tools/upstream_sync.py --help` covers the reporting half.

### Reviewing a hub sync PR

1. Read the upstream commit list in the PR body. Every changed year should have a reason
   there (new holiday list, corrected month).
2. Month-length changes: list each changed year in the PR with the evidence link. They make
   C# golden rows differ. Either regenerate the golden vectors against the NepDate version
   that contains the change (`tools/csharp-golden`), or add a deviation to `spec/PARITY.md`.
3. When the import settles a finding listed in `data/known-questions.json`, remove the entry and
   its row in `data/README.md` in the same PR.
4. CI green → merge. `CHANGELOG.md`: `Changed: calendar data synced from NepDate <short-sha>`.

## Spokes: `shared-sync.yml`

Runs every Tuesday and on demand in each port. It downloads the hub's `main`, replaces
`shared/`, writes the commit to `shared/VERSION`, runs the port's generator, and opens or
updates one PR on branch `bot/shared-sync`, assigned like the hub's. The PR body lists the hub
commits since the previous `VERSION`. After merge, release a **patch** version of that port
(data change, no API change).

The workflow runs the port's generator in a job without secrets or write permission and hands a
patch to a second job that opens the PR. For a spoke without a GitHub remote, or to test by hand,
`py tools/shared_sync.py ../nepdate-<language>` does the same copy from a hub commit and
`--check` does what `shared-check.yml` does in CI.

## When upstream is not updated in time

If the government has published next year's holidays and NepDate has no update yet:

1. Send the update to NepDate first (issue or PR there). Upstream first is the rule.
2. Only if a release can't wait: edit `data/patro/<year>.json` in the hub by hand (same shape,
   `schema: 1`), set its `source` to the real source, and say in the PR why upstream was
   skipped. The next upstream sync will show a diff until NepDate has the same data. Resolve
   it in favour of upstream once it lands.
3. Never edit a spoke's `shared/`. Its CI rejects that.

Acceptable sources for a hand edit:

| Data | Source |
|---|---|
| Public holidays | Government of Nepal (Ministry of Home Affairs) gazette / official notice. Cite the notice number and date |
| Month lengths | Nepal Panchanga Nirnayak Samiti official calendar. Only change *published* years |
| Tithi, events | the official panchang. Don't scrape commercial calendar apps or sites |

## One-time setup (maintainer)

Both workflows run with the default `GITHUB_TOKEN`; no App or secret is needed:

1. On the hub and on each spoke with a sync: *Settings → Actions → General → Workflow
   permissions → Allow GitHub Actions to create and approve pull requests*. Without it the PR
   step fails with "GitHub Actions is not permitted to create or approve pull requests".
2. The label `upstream-sync` on the hub and `shared-sync` on each spoke with a sync.
3. Each spoke's CI workflow has a `workflow_dispatch` trigger, and the spoke's caller job grants
   `actions: write` (the snippet at the top of `shared-sync.yml`).
4. Optional: variable `SYNC_ASSIGNEE` set to a GitHub username, if the PRs and issues should go
   to someone other than the repository owner.

A push made with `GITHUB_TOKEN` starts no workflow, so after opening or updating the PR each sync
starts the repository's CI on the bot branch with `workflow_dispatch`; its checks show on the PR
as usual.

Optional, a GitHub App instead: create one with *Contents*, *Pull requests* and *Issues* set to
read and write and no webhook, install it on the repositories, and put variable `SYNC_APP_ID` and
secret `SYNC_APP_PRIVATE_KEY` on an environment `sync` limited to `main`. The workflows then use
its token, and its pushes start CI on their own. The key can mint a token for any repository the
App is installed on: if one repository's secrets leak, revoke the key in the App settings.
