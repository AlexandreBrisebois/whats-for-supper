# SEARCH-02 — Browse and incremental results: proposed tasks

**Requirements:** [requirements.md](requirements.md)

**Design:** [design.md](design.md)

> These are **future audit/change tasks**, not a claim that shipped behavior is missing.
> No task below is authorized for implementation by this specification.

## Execution rules

- Select and approve a bounded change outcome before starting; use OpenAPI → tests → implementation for contract-affecting work.
- Stop on unresolved product intent, cross-household exposure, destructive-data ambiguity, contract drift, or a required schema decision.
- Record commands and actual pass/fail/blocked/not-run evidence; do not check off work from historical status.

## T1 — Baseline audit (required for any future change)

**Traceability:** SEARCH-02-AC1, SEARCH-02-AC2, SEARCH-02-AC3, SEARCH-02-AC4.
**Authorized effects after separate approval:** selected spec/evidence only; no runtime changes.
**Assertions:** exercise the verified route, capture every state named in requirements, compare wrapper/generated types/controller behavior with `specs/openapi.yaml`, and document divergences.
**Checks:** targeted existing React/API tests and OpenAPI generation/drift checks chosen by the execution harness.
**Stop:** intent differs from baseline, an endpoint is undocumented, or identity/eligibility cannot be demonstrated.

## T2 — Contract and test-first packet (required only if change is approved)

**Traceability:** affected acceptance IDs identified by T1.
**Design references:** Integration map; Data and control flow; Security and privacy.
**Authorized effects:** only explicitly approved OpenAPI/generated client, targeted API/PWA tests, and schema compatibility files.
**Assertions:** encode success, validation, authorization, empty/error, concurrency, and recovery semantics before implementation.
**Checks:** OpenAPI validation/client generation plus targeted API and PWA unit tests; add database compatibility checks if persistence changes.
**Stop:** failing baseline is unexplained, generated/manual models drift, or contract intent is unapproved.

## T3 — Vertical implementation (required only after T2 approval/evidence)

**Traceability:** implement only acceptance IDs covered by failing/approved tests.
**Design references:** State, failures, and recovery; Localization and accessibility; Performance and compatibility.
**Authorized effects:** named runtime files from the approved execution packet; no adjacent cleanup.
**Assertions:** request guards prevent stale writes, repeated actions are bounded, errors preserve context, identity/eligibility are server-enforced, and English/French plus keyboard/screen-reader behavior remain complete.
**Checks:** targeted .NET tests, PWA unit tests, lint/type checks, and relevant Playwright journey.
**Stop:** scope expands to another inventory feature, destructive semantics change, or required services/test identities are unavailable.

## T4 — Acceptance and drift review (required after an approved implementation)

**Traceability:** every changed acceptance ID → design section → test assertion → recorded command.
**Assertions:** review actual diff for authorized scope; verify OpenAPI/controller/generated client/mock parity; verify loading/empty/error/retry/concurrency/accessibility/localization and preserved behavior.
**Checks:** execution-harness completion checks, `git diff --check`, and local Markdown-link validation for changed specs.
**Stop:** any required check fails or is unqualified; report the blocker rather than declaring completion.

## Optional follow-up

Telemetry or performance-budget work is optional unless separately accepted. It must not collect household secrets, natural-language query contents, imported bundle contents, or recipe notes without an approved privacy decision.
