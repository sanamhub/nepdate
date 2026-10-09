# Roadmap (hub)

Small by design: this repository has data, specs and Python tools, no library. Each task is
one PR. Python tools use the standard library only.

```
H0 repository + CI ─► H1 tools ─► H2 upstream sync ─► H3 reusable workflows for spokes
                              └─► H4 holidays.ics on GitHub Pages
```

`nepdate-rust` phase L0 needs H0 merged (it vendors the hub's first commit). H2 and H3 must be
done before the first widget release (nepdate-rust W4), because the data runs out in April 2027.

## H0 Repository and CI

- H0-01 Human: create `sanamhub/nepdate` (public), push this directory. Enable branch protection
  on `main` (PR, 1 approval, CI green, no force-push), the dependency graph and private
  vulnerability reporting.
- H0-02 `.github/workflows/ci.yml` on `pull_request` and push to `main`: `actions/setup-python`,
  then `python spec/reference/verify_vectors.py`. Top-level `permissions: contents: read`,
  `concurrency` per ref, every action pinned to a full commit SHA with the version in a comment.
- H0-03 Community files: `SECURITY.md` (report via private advisory, first reply within a week),
  `CONTRIBUTING.md` (data changes go upstream first, see the runbook; behaviour changes need an
  issue first; Conventional Commits; writing rules), `CODE_OF_CONDUCT.md` (Contributor Covenant
  2.1), `.github/ISSUE_TEMPLATE/` (`data_error.yml`: date, what is wrong, official source;
  `spec_question.yml`; `config.yml` with blank issues off and the security link),
  `.github/pull_request_template.md`, `.github/dependabot.yml` (`github-actions`, weekly).

AC: CI green on the first PR. `verify_vectors.py` failing makes CI fail.

## H1 Tools

- H1-01 Split `spec/reference/verify_vectors.py` into `spec/reference/nepcal.py` (the calendar
  functions, no top-level work) and the checks, which import it. Resolve every path relative to
  the script's own location, so it runs from any directory (spokes vendor it under `shared/`).
  Output stays identical. Then `tools/make_vectors.py`: regenerate
  `spec/vectors/month-boundaries.csv` from `data/` using `nepcal`. `--check` exits 1 when the
  committed file differs. Add `--check` to CI.
- H1-02 `tools/data_status.py`: print first and last BS date of tithi, holidays and events and
  the days left from today. Exit 1 when public holidays end within 183 days (the release gate
  every app uses). When only tithi or events end within 183 days, print `WARNING` lines and exit 0,
  unless `--strict` is given (then exit 1; the weekly sync uses `--strict` to raise its issue).
  `--today YYYY-MM-DD` (AD) replaces today's date, for tests. CI runs it
  with `continue-on-error: true` (information only; H2 raises the issue).
- H1-03 `tools/extract_from_csharp.py`: leave a file untouched when its content (ignoring
  `source`) didn't change, so `commit` and `imported` only move with real data changes. Add
  `--summary <file>`: a Markdown list of changed BS years and months. The importer also writes
  `data/UPSTREAM` (one line: the upstream commit last imported, whether or not data changed) and
  regenerates `data/NOTICE` from `tools/NOTICE.template` with that commit and date.

- H1-04 `tools/data_sanity.py`: the checks in `data/README.md` "Known data questions" as a script
  (year length 365 or 366; each BS New Year within 1 day of the median of its ten neighbours).
  Prints findings; exits 1 only on a finding that is not listed in `data/known-questions.json`
  (a list of `{"check": ..., "years": [...]}`; the README table describes the same entries for
  people).

AC: running the importer twice on the same upstream commit changes no file. With the current data
(tithi ends BS 2083-12-30 = AD 2027-04-13, holidays end BS 2084-08-18 = AD 2027-12-03):
`--today 2026-10-12` exits 0 with no warning; `--today 2026-10-20` exits 0 with a tithi warning;
`--today 2026-10-20 --strict` exits 1; `--today 2027-06-04` exits 1. Each tool has a
`--help` and a test in `tools/tests/` run by CI (`python -m unittest`).

## H2 Weekly upstream sync (`.github/workflows/upstream-sync.yml`)

The five checks in `docs/runbooks/data-update.md`. `schedule: cron "15 3 * * 1"` +
`workflow_dispatch`. Two jobs, because the first one builds and runs upstream code:

- Job `check` (`permissions: contents: read`, no secrets, no token beyond the default read-only
  one):
  1. Partial clone of NepDate (`git clone --filter=blob:none`). If its `HEAD` equals
     `data/UPSTREAM`, only checks 3 and 4 below run.
  2. Run the importer with `--summary`, then `make_vectors.py`, `verify_vectors.py`,
     `data_sanity.py`, and the exhaustive check (`actions/setup-dotnet`, build
     `tools/csharp-exhaustive` against the clone, `compare_exhaustive.py`). Record each result;
     don't stop on a failure. The exhaustive check proves the importer read the new C# data
     correctly.
  3. Code-changed check: `git log <data/UPSTREAM>..HEAD -- . ':!src/NepDate/Core/Dictionaries'`
     in the clone.
  4. NuGet check: the latest `NepDate` version on nuget.org versus the one pinned in
     `tools/csharp-golden/*.csproj`; and `data_status.py --strict`.
  5. Upload the changed `data/`, `spec/vectors/` and a `report.md` with every result as an
     artifact.
- Job `publish` (`needs: check`; `contents: write`, `pull-requests: write`, `issues: write`):
  token from `actions/create-github-app-token` (scoped with `repositories:` to this repository)
  when `vars.SYNC_APP_ID` is set, else `GITHUB_TOKEN`. Download the artifact; never run code from
  the clone here.
- PR with `peter-evans/create-pull-request`: branch `bot/upstream-sync`, title
  `chore(data): sync from NepDate <short-sha>`, label `upstream-sync`, assignee
  `vars.SYNC_ASSIGNEE || github.repository_owner`.
- Issues through one shell function `report <title> <body-file>` that comments on the open issue
  with that title and label, or opens one. Uses `gh`.
- A comment is added to an open issue only when its body would differ from the last comment, so
  a weekly run doesn't repeat itself.

AC: a run against the current upstream opens no PR, and opens (or leaves unchanged) one "Data
running out" issue while fewer than 183 days of tithi remain. With `source.commit` set to an older
upstream commit on a test branch, it opens one PR; a second run updates that PR.

## H3 Reusable workflows for spokes

Spokes call these instead of copying YAML (ADR-0001 §3).
- H3-01 `.github/workflows/shared-check.yml` (`on: workflow_call`): read `shared/VERSION` in
  the caller, download the hub at that commit (`gh api repos/sanamhub/nepdate/tarball/<sha>`),
  fail if `shared/data` or `shared/spec` differs.
- H3-02 `.github/workflows/shared-sync.yml` (`on: workflow_call`, input `regenerate`, a shell
  command such as `cargo xtask codegen`; secrets for the app token): replace `shared/` with the
  hub's `main`, write `shared/VERSION`, run `regenerate`, open or update the PR on branch
  `bot/shared-sync` titled `chore(shared): sync from nepdate <short-sha>`, with the hub commit
  list since the previous `VERSION` in the body.

Spokes call them pinned to a full commit SHA of the hub (`uses:
sanamhub/nepdate/.github/workflows/shared-sync.yml@<sha> # main 2026-..`), never `@main`, pass
secrets by name (`secrets: { SYNC_APP_PRIVATE_KEY: ... }`, never `secrets: inherit`), and never
trigger them from `pull_request_target`. Dependabot (`github-actions`) proposes SHA updates.

AC: `nepdate-rust` calls both (its task L6-06) and they pass there.

## H4 Published holiday calendar (`holidays.ics`)

For `nepdate-mobile` MR-12 AC2 and anyone who wants Nepal holidays in Google, Apple or Outlook
Calendar without an app.
- H4-01 `tools/make_ics.py`: one all-day `VEVENT` per public-holiday day in `data/patro/*.json`
  (RFC 5545, CRLF line endings, lines folded at 75 octets). `DTSTART;VALUE=DATE` = the AD date,
  `DTEND` the next day. `SUMMARY` = that day's English event names joined with ` / `;
  `DESCRIPTION` = the Nepali names joined the same way, then the BS date. `UID` =
  `<bs-date>@nepdate.sanamhub.github.io` (one holiday day, one UID, so clients update instead of
  duplicating). `DTSTAMP` = the `source.imported` date of that year's file at `T000000Z`, so the
  output only changes when data changes. Calendar properties: `X-WR-CALNAME:Nepal public
  holidays`, `REFRESH-INTERVAL;VALUE=DURATION:P1W`. `--check` exits 1 when the committed
  `holidays.ics` differs. Unit tests check line folding, CRLF and one event per holiday day.
- H4-02 `.github/workflows/pages.yml`: on push to `main` touching `data/patro/` or
  `tools/make_ics.py`, and `workflow_dispatch`, build and publish
  `holidays.ics` to GitHub Pages (`actions/deploy-pages`, `pages: write` and `id-token: write` on that
  job only).

AC: the file passes the icalendar.org validator (checked by hand once, result in the PR); it has exactly as many events as holidays in `data/patro`
(294 today); importing it twice into a calendar client doesn't duplicate events; a data change on
`main` updates the published file within one workflow run.

## H5 Catalogue of C# NepDate's own tests

- H5-01 `tools/catalog_csharp_tests.py <NepDate-clone>`: read every `*.cs` under
  `tests/NepDate.Tests/`, find each `[Fact]` and each `[InlineData]` row of a `[Theory]`, and write
  `spec/vectors/csharp-tests/catalog.tsv` with columns `id` (`<File>.<Method>` plus `#<n>` for theory
  rows), `file`, `method`, `data` (the InlineData arguments as written), `asserts` (the first
  `Assert.` line, trimmed to 200 characters) and `phase` (`1`..`4`, `n/a`, or a deviation `D-xx`).
  The `phase` column is filled by a mapping file `tools/csharp_tests_phase.tsv` (method name
  pattern to phase), reviewed by the human; rows with no mapping fail the tool.
- H5-02 Add the upstream test commit to `data/UPSTREAM`-style tracking: the weekly sync (H2) re-runs
  the catalogue and reports new or removed rows in its PR.

AC: the catalogue has 395 + 147 rows at `cb05cb65` (one per `[Fact]`, one per `[InlineData]`); every
row has a `phase`; `--check` exits 1 when the committed file differs.

Status 2026-10-09: H5-01 is done (`tools/catalog_csharp_tests.py`, `tools/csharp_tests_phase.tsv`,
542 rows: phase 1 113, phase 2 180, phase 3 148, phase 4 40, D-14 17, n/a 44). The phase mapping is
by file, plus method prefix for `OptimizationVerificationTests.cs`; the human reviews it, and rows
that test a PARITY deviation get a finer pattern when a port finds one. H5-02 (weekly re-run in the
sync) is open.

## H6 C# baseline benchmark

- H6-01 `tools/dotnet-bench/`: a BenchmarkDotNet console project referencing the NepDate NuGet
  package at the version pinned in `tools/csharp-golden` (2.0.7), with `[MemoryDiagnoser]`,
  implementing B1–B8 of `spec/BENCHMARK.md` on the 64 dates.
- H6-02 Run it on the reference machine pinned to logical CPU 2; write `docs/benchmarks/dotnet.md`
  (machine, SDK, runtime, command, table of mean ns/op, error, bytes/op).

AC: the table has B1–B8; the run command and versions are recorded; every port's
`docs/benchmarks.md` copies its C# column from this file.

Status 2026-10-07: H6-01 and a first H6-02 run are done (`docs/benchmarks/dotnet.md`, findings in
`docs/research/dotnet-internals.md`). Other jobs were running at the time, so B5 and B8 are noisy:
rerun on an idle machine before the numbers are final (H6-03).
H6-03 done 2026-10-09: the idle rerun replaced the table (.NET 10 B1 13.29, B2 18.64, B3 17.50,
B4 18.85, B5 153.02, B6 21.55, B7 47.93, B8 3,132.66 ns) and every port's C# figures were updated.

## Proposed: data schema 2 (needs an ADR before work starts)

Raised by `nepdate-mobile` (its ADR-0003 §7); not scheduled.
- `scope` per holiday: `national` (default), `valley` (Kathmandu Valley only), `women`
  (women employees), or `community:<name>`. Today this is encoded only in the event name, so ports
  can't filter or mark it.
- `tbd` flag for holidays whose date the government announces later.
- Upstream first (hub ADR-0002): propose the fields to C# NepDate, or keep them in a hub-only
  overlay file merged by the extractor. Each port's codegen would then emit a scope column; a schema
  version bump is a minor release for every port.
