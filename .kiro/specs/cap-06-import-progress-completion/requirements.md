# CAP-06 — Import progress and completion requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **CAP-06-R1.** Capture/import commands create durable pending recipe/workflow state; accepted import is not presented as a ready recipe.
- **CAP-06-R2.** Workflow processors complete recipe import/synthesis and persist ready or failure outcomes. Ready recipe visibility follows recipe readiness rules rather than client optimistic state.
- **CAP-06-R3.** `recipe_ready` and `recipe_failed` SSE events let capture/library/GOTO stores remove matching local pending work and show scoped notifications when applicable.

## Limits and boundaries

SSE is not guaranteed delivery or a universal status query; reconnect/other-device views rely on their authoritative fetches. CAP-07 owns failure recovery UI, PLAT-02 owns workers/retries, PLAT-01 owns event transport, and CAP-01–04 own initiation inputs.
