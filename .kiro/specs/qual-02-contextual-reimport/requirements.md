# QUAL-02 — Contextual re-import requirements

## Status

**Implemented capability baseline.**

## Outcome

Eligible sourced recipes can start a contextual re-import from materially changed ingredients/steps feedback while retaining the report.

## Implemented behavior

- **QUAL-02-R1.** A re-import requires a re-importable recipe, ingredients or steps (not duplicate), and a nonblank note.
- **QUAL-02-R2.** The report is saved first. An identical active attempt is returned as already started; unchanged prior feedback starts nothing; changed feedback starts a workflow after no conflicting active attempt.
- **QUAL-02-R3.** Workflow launch records its instance ID/status. Completion marks the report ready to review (or reported for duplicate); failure records a safe re-import failure message. Launch failure leaves the report saved and clears an unstarted attempt when possible.
- **QUAL-02-R4.** The initiating UI distinguishes accepted background work from completion, but does not poll or receive a dedicated status event; later detail fetches expose durable state.

## Boundaries and limitations

QUAL-01 owns reporting UI/data; CAP-06 source import and CAP-07 failure recovery are adjacent but distinct; PLAT-02 owns workflow scheduling/execution. The in-process lock is not multi-replica-safe. No public `GET /api/recipe-imports/{id}` is used by this flow, despite older documentation claims.
