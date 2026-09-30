# PLAN-01 — Week navigation and status: follow-up candidates

This implemented baseline has no implementation work selected. The items below are optional, separately authorized improvements.

- [ ] **T1 (optional) — Define and enforce week-offset input policy.** Decide whether offsets must be whole, bounded weeks; then align URL parsing and API validation without changing the server’s clock-derived identity implicitly.
  **Test seam:** `pwa/src/app/(app)/planner/page.test.tsx` and schedule API validation tests; Playwright scenario: paste invalid/out-of-range `weekOffset` then use navigation; mock owner: the planner vertical slice; route/method: `GET /api/schedule?weekOffset=<integer>`; expected contract: `{ data: ScheduleDays }`, with an explicitly approved validation-error envelope if rejected.

- [ ] **T2 (optional) — Provide recoverable week-load failure UI.** Preserve the last confirmed view and add localized retry/accessibility behavior for a failed schedule fetch.
  **Test seam:** `weekStore.test.ts` and planner-page tests; Playwright scenario: schedule request fails then retry restores the same selected week; mock owner: the planner vertical slice; route/method: `GET /api/schedule?weekOffset=<integer>`; expected contract: `{ data: ScheduleDays }` on success and the existing approved API error envelope on failure.

- [ ] **T3 (optional) — Review non-current-week stream convergence.** Determine whether remote changes to a viewed nonzero week need a new subscription/refetch mechanism; retain current week-0 stream semantics unless a contract owner approves a change.
  **Test seam:** `useScheduleStream.test.ts`, `weekStore.test.ts`, and schedule integration tests; Playwright scenario: view next week while another client changes it and verify the approved refresh behavior; mock owner: the planner/SSE vertical slice; route/method: `GET /api/schedule?weekOffset=<integer>` and `GET /api/stream`; expected contract: `ScheduleDays` snapshot and `week_updated { schedule, echoSeq? }` event.
