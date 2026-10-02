# Shared Real-Time State — Future work

- [ ] **PLAT-01-T1 — Define a consistent stale-event/version policy for a selected event family.**
  - **Test seam:** publisher/controller integration, `useScheduleStream.test.ts`, owning-store tests; Playwright: delayed/replayed selected event does not replace newer state; mock owner: selected feature vertical slice; `GET /api/stream`; event carries the approved identity/version plus its existing payload shape.
