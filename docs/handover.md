# Handover: implementing the NepDate family

For the agent or developer who implements the plans, and for the reviewer who checks the work
afterwards. Planning is finished in all nine repositories; no library or app code exists yet.

## 1. The repositories

| Repository | What | Plan | Phases |
|---|---|---|---|
| `nepdate` (hub) | data, specs, tools, upstream sync | `docs/plan/00-ROADMAP.md` | H0–H4 |
| `nepdate-kotlin` | Kotlin/JVM library, used by the Android app | `docs/plan/00-ROADMAP.md` | K0–K5 |
| `nepdate-swift` | Swift library, used by the iOS app | `docs/plan/00-ROADMAP.md` | S0–S5 |
| `nepdate-mobile` | Android and iOS apps with widgets | `docs/plan/00-ROADMAP.md` | M0, A1–A3, I1–I3 |
| `nepdate-rust` | Rust library and desktop widget | `docs/plan/00-ROADMAP.md` | L0–L6, W0–W4 |
| `nepdate-typescript` | TypeScript library | `docs/plan/00-ROADMAP.md` | T0–T5 |
| `nepdate-python` | Python library | `docs/plan/00-ROADMAP.md` | P0–P5 |
| `nepdate-go` | Go library | `docs/plan/00-ROADMAP.md` | G0–G5 |
| `nepdate-cpp` | C++ library | `docs/plan/00-ROADMAP.md` | C0–C5 |

Every library ships two units, the core and the patro (tithi, holidays, events), named by its
ecosystem's conventions (ADR-0004). Every library meets the same acceptance criteria,
`spec/PORT-PLAN.md`, implements the C# test catalogue (`spec/vectors/csharp-tests/catalog.tsv`)
and is benchmarked by `spec/BENCHMARK.md`, using the names in its own `docs/API.md`.

**Where the repositories live.** All nine are local git repositories, side by side under
`E:\github\sanamhub\` (`E:\github\sanamhub\nepdate`, `E:\github\sanamhub\nepdate-rust`, and so on),
each on branch `main`. A spoke reads the hub at `..\nepdate` when it re-syncs `shared/`. There are no
GitHub remotes yet: the human creates them and pushes from these folders once the work is finished,
and development continues there afterwards. Exception: `nepdate-swift` and `nepdate-mobile` may get
their remotes earlier, because Swift and iOS build only on GitHub's macOS runners (`nepdate-mobile`
ADR-0010).

## 2. Order of work

Do one phase at a time, in this order. A later item may start only when its preconditions (in its
roadmap) are met.

1. Hub H0, H1, H5 and H6 (repository, CI, tools, the C# test catalogue, the C# benchmark
   baseline). Every spoke vendors the hub, so this comes first. H5-01 and H6 were done during
   planning (status in the hub roadmap); H5-02 is built with H2.
2. Hub H3 (reusable `shared-check` and `shared-sync` workflows). Each spoke's phase 0 task that
   wires them waits for this.
3. `nepdate-kotlin` K0–K4, then `nepdate-mobile` M0 and A1–A2. Android first: most users in Nepal
   use Android, and it can be built and tested on Windows.
4. `nepdate-kotlin` K5 (0.1.0 on Maven Central), then `nepdate-mobile` A3 (Android 1.0). A3 needs the
   released library: F-Droid and reproducible builds can't use a local path.
5. Hub H2 (weekly upstream sync) before any app release, and H4 (`holidays.ics`) before MR-12.
6. `nepdate-swift` S0–S5, then `nepdate-mobile` I1–I3 (iOS, built on GitHub's macOS runners,
   `nepdate-mobile` ADR-0010).
7. `nepdate-rust` L0–L6 and W0–W4, `nepdate-cpp` C0–C5, then `nepdate-typescript`,
   `nepdate-python`, `nepdate-go`, in any order.

The human may change this order; the roadmaps' preconditions still apply.

## 3. How to do one task

1. Read the repository's `AGENTS.md`, its ADRs, `docs/API.md` and the phase file. Check the phase's
   preconditions; if one is unmet, stop and record it (step 7).
2. Load the repository's `writing-style` skill before writing any prose, comment or commit message.
3. Branch `feat/<task-id>-<short-slug>`, for example `feat/K1-03-serial-conversion`.
4. Write the tests for the acceptance criteria first and see them fail. Then implement.
5. Run the repository's CI command (`./scripts/ci.sh`, `cargo xtask ci`, `./gradlew ci`, and so on)
   until it passes. Never weaken, skip or delete a test to get there; deviations are allowed only for
   IDs in `spec/PARITY.md`, named in a comment.
6. Commit with Conventional Commits naming the task (`feat(nepdate): K1-03 serial conversion`). No
   AI attribution lines in commits or PRs. Commit locally; push only after the human has created the
   GitHub repository and asks for it.
7. Update `docs/plan/PROGRESS.md` in that repository (create it on the first task):

   ```markdown
   | Task | Status | Commit | CI last line | Notes and open questions |
   |---|---|---|---|---|
   | K1-03 | done | 1a2b3c4 | `ci: 9 checks passed` | none |
   ```

   Status is `done`, `blocked` (say on what) or `partial` (say what is missing).

## 4. Checkpoints: the implement and review loop

The last task of every phase ends at a **checkpoint**. At a checkpoint the implementation agent:

1. makes sure every task of the phase is `done` in `PROGRESS.md` (or `blocked` with a question);
2. runs the CI command from a clean checkout and pastes its last line;
3. adds a line `| <phase> checkpoint | ready for review | <commit> | ... |` to `PROGRESS.md`;
4. stops. It doesn't start the next phase.

The reviewer (the lead agent) then does a **light check** of that phase: CI green from a clean
checkout, no public symbol or dependency outside `docs/API.md` and the ADRs, the phase's catalogue
rows covered, and the phase file's "Checkpoint" list ticked. It records the result in `PROGRESS.md`
as `| <phase> light check | ok |` or `| <phase> light check | fix: ... |` and hands back; the
implementation agent fixes any `fix:` item before it continues. The **full review** against section 8
happens once, at the end, before any remote is created or anything is published.

## 5. Stop and ask, don't guess

Stop the task, mark it `blocked` in `PROGRESS.md` and ask the human when:
- a precondition is unmet, or a human task (below) isn't done;
- the spec and a vector disagree, or the spec doesn't say what to do;
- the work needs a dependency, public symbol or file layout that the ADRs and `docs/API.md` don't
  list;
- data looks wrong. Data is fixed in the hub, and upstream first (hub ADR-0002), never in a spoke's
  `shared/` folder.

## 6. Rules that apply everywhere

- `shared/` in a spoke is a read-only copy of the hub. Never edit it.
- Generated table files say "DO NOT EDIT". Change the generator and run it.
- The core package never depends on the patro package (ADR-0004); CI checks that the built core
  doesn't contain `World Day Against Human Trafficking`.
- No secrets in code, logs, commits or chat. Keys go only in GitHub environment secrets.
- No network access in the apps; no analytics, ads or tracking (`nepdate-mobile` ADR-0007).
- UI work follows the `frontend-design` skill within `nepdate-mobile/docs/product/design-system.md`.

## 7. Human tasks (the agent can't do these)

| When | Task |
|---|---|
| before H0 | create `sanamhub/nepdate`; branch protection |
| before H2 | create the GitHub App for sync PRs and store its key as a secret (`docs/runbooks/data-update.md`) |
| before each spoke's phase 0 | create the repository; branch protection; `production` environment with a required reviewer |
| before K5 | verify the `io.github.sanamhub` namespace on the Central Portal; signing key and token as secrets |
| before P0 | decide the PyPI name (`nepdate` is taken; see `nepdate-python/docs/competitors.md`) |
| before the first release of each registry package | trusted publishing (crates.io after a first manual publish, npm, PyPI) |
| before M0 | confirm the app ID `np.nepdate`; Apple Developer Program; Play Console account |
| before A3 and I3 | ask Raju where NepDate's tithi, holiday and event data came from (`docs/upstream/proposals.md`, U-04); ask the Panchanga Samiti whether a digital calendar needs approval |
| A3 | 12 Play testers for 14 days |
| before C0 | C++ compiler: zig 0.17.0 (Clang 22) at `E:\tools\zig` is used for now; the Visual Studio "Desktop development with C++" workload (MSVC, the C++ ADR's main Windows target) is installed before C5 |
| before H6 and each phase 5 | the language toolchains for benchmarking on the reference machine (Go and Rust are installed; Node, Python, .NET and Android Studio's JDK already were); Swift benchmarks run in CI |
| before April 2027 | event data ends (tithi on BS 2083-12-30): get BS 2084 data upstream, or apps show "no data" |

## 8. Review checklist

The reviewer checks each repository against this list and the `PROGRESS.md` it finds:

1. Every acceptance criterion of every finished task has a test, and the test fails without the code.
2. The CI command passes from a clean checkout; the last line matches `PROGRESS.md`.
3. Public surface equals `docs/API.md`; no extra dependencies; generated files match their generator
   (`--check`).
4. `shared/` is identical to the hub at `shared/VERSION`.
5. The core/patro split holds (manifest and `World Day Against Human Trafficking` check).
6. Performance: the phase's hot paths follow the representation ADR (no allocation where it says
   none), and from phase 5 the benchmark numbers meet `spec/BENCHMARK.md` §6 or the miss is reported.
7. Every C# catalogue row of the phase has a test or a named deviation.
8. Prose follows the writing style; no AI attribution; no secrets.
9. Anything `blocked` or `partial` has a clear question for the human.
