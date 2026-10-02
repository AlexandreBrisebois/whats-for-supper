# PWA cache coherence — Tasks

**Status:** Planned. Select one task at a time; no old numbered prompt is an active implementation instruction.

## Task 1 — Choose one read path and map ownership

- **Requirements:** PCC-01–PCC-04
- **Outcome:** A source-grounded map of current reads, cache behavior, identity, mutation/SSE invalidation, and recovery for one product path.
- **Stop:** Do not enable framework caching or persistent storage during discovery.

## Task 2 — Specify the smallest safe coherence change

- **Requirements:** PCC-01–PCC-05
- **Outcome:** An approved vertical slice with exact cache key/owner, invalidation, rollback, and no-stale-write rules.
- **Test seam:** Name affected unit tests, Playwright spec, mock owner, and any API route before implementation begins.
- **Stop:** A new persistence mechanism, framework experimental flag, or API contract change requires explicit approval in the selected slice.

## Task 3 — Implement and qualify the selected slice

- **Requirements:** Selected subset from PCC-01–PCC-05
- **Outcome:** Tests precede code; implementation, mocks, and user-visible E2E behavior change together.
- **Checks:** Use the selected task's API/PWA/E2E commands and normal harness finish procedure. Record only the scope actually exercised.
