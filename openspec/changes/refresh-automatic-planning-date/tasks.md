# Tasks

## 1. Automatic candidates respect deployment-local today

**Outcome and scenarios:** Find first-open placement, historical scan reference and browser timezone difference.
**Owners and boundaries:** `slotAssignment.ts`, existing schedule wrapper and calendar helpers; existing GET schedule envelope/date/reference fields.
**Dependencies and prerequisites:** Local fixtures with seven complete dates, authoritative calendar and empty past/today/future slots. No product change is authorized by this proposal.
**Acceptance boundary:** Existing scanner/wrapper and component tests, method-sensitive mock `GET /api/schedule`; unchanged assignment contract.

- [ ] 1.1 Add stale-index, historical-reference, Sunday/Monday, browser/deployment timezone difference, malformed week and all-full 520-week regressions to `pwa/src/lib/planner/slotAssignment.test.ts`; run `task test:unit -- src/lib/planner/slotAssignment.test.ts` before logic changes and record intended behavioral red.
- [ ] 1.2 Correct the existing scan's eligibility/date/reference handling, preserving all non-cooking/completed/occupied exclusions and bounded reads. Run the same test command green; today empty wins, past empties never win, and failed reads never imply availability.

## 2. Rollover and pre-save validation preserve dated intent

**Outcome and scenarios:** Refresh automatic suggestions; before-save historical rejection; explicit historical planning; uncertain earlier-write reconciliation.
**Owners and boundaries:** RecipesExperience target resolution/save, deployment-calendar/Today lifecycle, existing generated client and method-sensitive browser mocks for `GET /api/schedule` and `POST /api/schedule/assign`. No new payload/endpoint.
**Dependencies and prerequisites:** Slice 1; fake elapsed/server time, visibility/focus and delayed calendar replies; released ownership of overlapping Recipes files.
**Acceptance boundary:** Browser/component → real API wrapper → mocked protocol; deterministic time tests plus existing API date/reference seam acceptance. No production tests during planning.

- [ ] 2.1 Add regressions in `pwa/src/app/(app)/recipes/page.test.tsx` for rollover while open, suspended-tab resume, rollover during scan, click immediately after midnight, calendar read failure, still-future date, explicit historical chooser/route and unknown-write recovery on original date. Run `task test:unit -- 'src/app/(app)/recipes/page.test.tsx'` before implementation and record behavioral red.
- [ ] 2.2 Reuse freshness/generation lifecycle, retain automatic/explicit origin and recheck fresh calendar plus captured slot before new automatic assignment. Run slices 1/2 unit commands green. An expired date produces zero POSTs until the newly shown date is deliberately activated; existing explicit past-day behavior and unknown-write recovery stay intact.
- [ ] 2.3 Extend `pwa/e2e/recipe-detail-layout.spec.ts` and `recipe-detail-planning-live.spec.ts` with the affected dated-navigation/mock boundary and real disposable API/database seam where applicable. Run `task test:e2e -- recipe-detail-layout.spec.ts --workers=1`, then the existing disposable live fixture's `recipe-detail-planning-live.spec.ts` acceptance. Verify exact date/reference and no duplicate/retargeted writes; document tested identity and any live blocker. Update affected copy/docs in this slice.

## 3. Final Integration and Verification

- [ ] 3.1 Reconcile scenario evidence, scope review and applicable preparation, then run `task verify -- <complete reviewed task-owned paths>` and `openspec validate refresh-automatic-planning-date --strict`. Report statuses and record_path; missing required seam acceptance remains blocked.

Planning evidence: source/artifact review only. Implementation and runtime acceptance remain unstarted.
