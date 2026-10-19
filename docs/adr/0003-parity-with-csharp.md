# ADR-0003: Parity with C# NepDate, one set of deviations for every port

- **Status:** accepted
- **Date:** 2026-09-24 (moved from nepdate-rust ADR-0009 on 2026-09-25)
- **Approved by:** Sanam

## Context

"Port" can mean "same behaviour" or "same idea". Every port has to mean the same one. The C# docs
disagree with the C# code in several places (listed in `spec/PARITY.md` §1).

## Decision

- The oracle is the C# **code**, captured as golden vectors from the published NuGet package.
  Docs are never the oracle.
- A short, closed list of deliberate deviations (D-01 … D-15) applies to **every** port in the
  same way. The list and the golden vector files live in `spec/PARITY.md`, so they are
  vendored into each spoke with the rest of `spec/`.
- A new deviation is a PR to this hub, never a port-local decision.

## Consequences

- Parity is provable (20,853 golden rows + 7176 boundary rows), not claimed.
- Two ports can never disagree because one of them chose a different deviation.
