# DISC-01 — Swipe discovery queue future work

- [ ] **DISC-01-T1 — Define selected queue stale-result behavior after a stream invalidation.**
  - **Test seam:** `discoveryStore.test.ts`, stream tests and discovery API integration; Playwright: open queue, apply invalidation, ensure removed/changed candidate is not swiped; mock owner: DISC-01 vertical slice; selected discovery GET route and SSE event; response/event includes existing candidate identity and invalidation context.
