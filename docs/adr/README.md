# Architecture Decision Records (hub)

Decisions that bind every NepDate port. Port-specific decisions live in each port's
repository. Immutable once accepted; supersede with a new ADR.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-hub-and-spoke-repositories.md) | Hub-and-spoke repositories for NepDate ports | Accepted |
| [0002](0002-canonical-data-and-upstream-first.md) | Canonical, language-neutral calendar data, upstream first | Accepted |
| [0003](0003-parity-with-csharp.md) | Parity with C# NepDate, one set of deviations for every port | Accepted |
| [0004](0004-patro-in-a-separate-package.md) | Patro (tithi, holidays, events) in a separate package | Accepted |
| [0005](0005-website-on-nepdate-com.md) | The website on nepdate.com, built from site/ in the hub | Accepted |
| [0006](0006-patro-site.md) | patro.nepdate.com, a calendar site built from patro/ in the hub | Proposed (amends 0005 decision 3) |
| [0007](0007-one-version-line-for-every-sdk.md) | One version line for every NepDate SDK | Proposed |

New ADR: copy the shape of 0001 (Status, Date, Approved by, Context, Decision, Consequences,
Alternatives considered) as `NNNN-kebab-title.md`.
