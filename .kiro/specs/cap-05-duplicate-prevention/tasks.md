# CAP-05 — Duplicate prevention future tasks

> **Status:** Proposed audit/change plan only. Nothing here is authorized or marked pending implementation; current shipped behavior is not represented as unfinished work.

## Traceability

| Proposed task | Requirements | Design area | Required assertions/checks |
|---|---|---|---|
| T1 Baseline audit | R1–R8 | Integration map | Evidence table matches current contract, UI, server, and tests |
| T2 Resolve policy decisions | R4–R5, R7 | State/security | Product-approved idempotency, notification, locale, and member-switch decisions |
| T3 Contract-first delta (only if approved) | R2–R5 | Client/contract/server flow | OpenAPI lint/generation and compatibility assertions |
| T4 Vertical behavior delta (only if approved) | R1–R8 | UI through persistence/workflow | Focus, failure, concurrency, async, privacy, localization assertions |
| T5 Acceptance review | R1–R8 | Verification | Targeted unit, contract, integration, database, and E2E evidence |

## Proposed execution details

### T1 — Re-verify baseline (required before any future change)

- Read only current non-archived paths named in `design.md`; compare implementation and generated client to `specs/openapi.yaml`.
- Record demonstrated behavior separately from assumptions and product decisions.
- **Checks:** targeted existing tests named in the design, OpenAPI validation, and `git diff --check`.
- **Stop:** stop on contract/code divergence, inaccessible environment, or ownership ambiguity; document it rather than silently choosing a source.

### T2 — Decide consequential policy (required before dependent change)

- Obtain product decisions for the open questions in `requirements.md`; preserve stable requirement IDs when meaning is unchanged.
- **Assertions:** accepted vs complete wording, cross-device conflict behavior, notification recipient, and processing/interface language boundary are unambiguous.
- **Stop:** unresolved decisions block only dependent tasks; they do not authorize guessed behavior.

### T3 — Specify and test contract delta (conditional, not authorized)

- If an approved decision changes HTTP/events/models, update OpenAPI first, then contract tests/generated clients, then server tests.
- **Checks:** repository OpenAPI generation/parity task, affected API test filter, and compile/typecheck.
- **Stop:** do not edit consumers until the approved contract and failing acceptance test agree.

### T4 — Implement one vertical slice (conditional, not authorized)

- Change only files required by the approved delta, retaining current recovery and household isolation.
- Add deterministic assertions for happy, validation, failure, late async, repeat activation, keyboard/focus, and locale behavior.
- **Stop:** halt on data migration, destructive compatibility, new secret/PII exposure, or cross-feature policy not covered by approval.

### T5 — Review and evidence (conditional)

- Run targeted component/API/integration tests plus the smallest relevant end-to-end journey; review requirement → design → assertion coverage.
- Record exact commands and results; do not check off shipped behavior based on history.
- **Stop:** unresolved required acceptance or contract drift prevents completion; unrelated failures are reported, not repaired without scope.
