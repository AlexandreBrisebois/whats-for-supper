# GROC-02 — Collaborative shopping state: future work

This implemented baseline has no implementation backlog. Select and authorize a task before changing application behavior.

- [ ] **GROC-02-T1 — Add ordered reconciliation for rapid local and remote checklist writes.** Define a server-issued version or line-level mutation acknowledgement before changing optimistic/stream behavior; coordinate the contract with `plat-01`.
  - **Test seam:** `ScheduleServiceTests`/schedule integration, `GroceryList.test.tsx`, and `useScheduleStream.test.ts`; Playwright: rapid toggle followed by delayed old response/event retains the newest accepted check state; mock owner: this GROC-02 vertical slice; `PATCH /api/schedule/{weekOffset}/grocery/item`; request `{ ingredientName, checked, expectedVersion? }`, response/event includes authoritative state plus version.

- [ ] **GROC-02-T2 — Improve failed-toggle recovery.** Decide localized error copy and an explicit retry that cannot duplicate an unknown accepted mutation.
  - **Test seam:** `GroceryList.test.tsx` and schedule API integration; Playwright: failed toggle announces an actionable retry and preserves context; mock owner: this GROC-02 vertical slice; `PATCH /api/schedule/{weekOffset}/grocery/item`; request remains `{ ingredientName, checked }`, response distinguishes accepted `204` from a documented problem/error body.
