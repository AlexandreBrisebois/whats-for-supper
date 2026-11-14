# Tasks

## 1. Automatic candidates respect deployment-local today

**Outcome and scenarios:** Find first-open placement, historical scan reference and browser timezone difference.
**Owners and boundaries:** `slotAssignment.ts`, existing schedule wrapper and calendar helpers; existing GET schedule envelope/date/reference fields.
**Dependencies and prerequisites:** Local fixtures with seven complete dates, authoritative calendar and empty past/today/future slots. No product change is authorized by this proposal.
**Acceptance boundary:** Existing scanner/wrapper and component tests, method-sensitive mock `GET /api/schedule`; unchanged assignment contract.

- [x] 1.1 Add stale-index, historical-reference, Sunday/Monday, browser/deployment timezone difference, malformed week and all-full 520-week regressions to `pwa/src/lib/planner/slotAssignment.test.ts`; run `task test:unit -- src/lib/planner/slotAssignment.test.ts` before logic changes and record intended behavioral red.
- [x] 1.2 Correct the existing scan's eligibility/date/reference handling, preserving all non-cooking/completed/occupied exclusions and bounded reads. Run the same test command green; today empty wins, past empties never win, and failed reads never imply availability.

## 2. Rollover and pre-save validation preserve dated intent

**Outcome and scenarios:** Refresh automatic suggestions; before-save historical rejection; explicit historical planning; uncertain earlier-write reconciliation.
**Owners and boundaries:** RecipesExperience target resolution/save, deployment-calendar/Today lifecycle, existing generated client and method-sensitive browser mocks for `GET /api/schedule` and `POST /api/schedule/assign`. No new payload/endpoint.
**Dependencies and prerequisites:** Slice 1; fake elapsed/server time, visibility/focus and delayed calendar replies; released ownership of overlapping Recipes files.
**Acceptance boundary:** Browser/component → real API wrapper → mocked protocol; deterministic time tests plus existing API date/reference seam acceptance. No production tests during planning.

- [x] 2.1 Add regressions in `pwa/src/app/(app)/recipes/page.test.tsx` for rollover while open, suspended-tab resume, rollover during scan, click immediately after midnight, calendar read failure, still-future date, explicit historical chooser/route and unknown-write recovery on original date. Run `task test:unit -- 'src/app/(app)/recipes/page.test.tsx'` before implementation and record behavioral red.
- [x] 2.2 Reuse freshness/generation lifecycle, retain automatic/explicit origin and recheck fresh calendar plus captured slot before new automatic assignment. Run slices 1/2 unit commands green. An expired date produces zero POSTs until the newly shown date is deliberately activated; existing explicit past-day behavior and unknown-write recovery stay intact.
- [x] 2.3 Extend `pwa/e2e/recipe-detail-layout.spec.ts` and `recipe-detail-planning-live.spec.ts` with the affected dated-navigation/mock boundary and real disposable API/database seam where applicable. Run `task test:e2e -- recipe-detail-layout.spec.ts --workers=1`, then the existing disposable live fixture's `recipe-detail-planning-live.spec.ts` acceptance. Verify exact date/reference and no duplicate/retargeted writes; document tested identity and any live blocker. Update affected copy/docs in this slice.

## 3. Final Integration and Verification

- [ ] 3.1 Reconcile scenario evidence, scope review and applicable preparation, then run `task verify -- <complete reviewed task-owned paths>` and `openspec validate refresh-automatic-planning-date --strict`. Report statuses and record_path; missing required seam acceptance remains blocked.

Implementation checkpoint: slices 1 and 2 implemented and verified below. Remaining task boxes track required browser/final gates rather than code presence.

Slice 1 evidence (2026-11-07, base `817f86a6`): `task test:unit -- src/lib/planner/slotAssignment.test.ts` observed four intended failures selecting past Monday, then 49/49 passed after candidate date filtering. Includes existing protected-slot, partial-week, missing-read and 520-week checks. Tools installed under `/tmp/wfs-tools`; supplied Node v24.19.0/dependencies differ from repository pins; final verification will report qualification limits.

Slice 2 evidence: page tests first observed four intended behavioral failures (timer rollover, midnight activation, calendar retry state, expired in-flight scan). Additional regressions observed two failures for target-reread retry and cached-calendar renewal before their fixes. With pinned Node v26.12.0, npm 11.21.1 and `npm ci`, `task test:unit -- 'src/app/(app)/recipes/page.test.tsx' src/lib/planner/slotAssignment.test.ts` passed 135/135. Focus/visibility, still-future activation, explicit historical route/chooser and original-date uncertain-write recovery remain covered. No endpoint/payload changes.

Final focused acceptance: 136/136 scanner/page tests pass after formatting, including rejected and absent pre-save slot reads. The absent-slot case was observed red before correction. Targeted ESLint passed with one pre-existing warning at RecipesExperience.tsx:617; type checking passed. Pinned .NET SDK `11.0.100-rc.2.26504.105` was extracted into `/tmp/wfs-dotnet` for isolated tests; no repository runtime configuration changed.

Live seam acceptance: `WFS_CALENDAR_LIVE=1 task test:api -- --filter FullyQualifiedName~LiveBrowser_RecipeDetailPlanningAndTwoClientRecovery` passed (47 seconds), using the repository's disposable PostgreSQL helper. Final source hashes were identical before/after; the owned container was removed. Evidence: `.task/refresh-automatic-planning-date/live-postgres.log` and `live-identity.json`. Tokyo browser/Toronto calendar recommendation skips earlier empty weekdays; existing generated-client dated writes and two-client recovery also pass. Browser midnight/replacement test passes with exact guarded POST/reference and zero writes before deliberate replacement activation.

Separate existing failure reproduced unchanged: `task test:unit -- src/components/recipes/RecipeDetailSheet.test.tsx -t 'previews four portions independently'` fails looking for the removed `Original quantities` button. Evidence: `.task/refresh-automatic-planning-date/original-quantities.log`. It is outside this correction and was not edited. The first full layout run was 50 passed/1 keyboard-focus failure; the focused rerun passed all 3 selected cases. The final full rerun and repository verification results are reported at handoff; missing/failing gates leave their task boxes unchecked.

Scope review: seven changed paths, limited to the scanner, Recipes automatic-target lifecycle/save validation, their unit/browser acceptance, and this task record. Explicit target origins retain historical eligibility; uncertain outcomes retain the original captured slot and disable automatic retargeting until reconciliation. No API contract, generated client, production configuration, or other proposal changed. `task prepare -- <these seven paths>` passed; whitespace review passed. Final `task verify` records are under `.task/agent-finish/runs/`; consult the reported invocation record for actual broad-check statuses. At this implementation checkpoint, this change had not been archived, pushed, merged or deployed.

Final browser acceptance: `task test:e2e -- recipe-detail-layout.spec.ts --workers=1` passed 51/51 on an isolated rerun (the earlier focus failure did not recur). Final application sources were unchanged. Evidence: `.task/refresh-automatic-planning-date/browser-layout-final.log`. Task 2.3 is complete; task 3.1 remains unchecked pending passing final repository gates.

Final recovery increment: an observed regression showed the old action remained enabled while rereading after an uncertain write was confirmed absent. Recovery now freezes the captured slot while its write is uncertain and uses the existing checking-state refresh callback after the original is confirmed empty. A conflicting original retains its captured target. The focused suites pass 137/137. The earlier final-harness invocation was invalidated by this additional regression/fix and is not final-content evidence; a fresh invocation follows the affected acceptance reruns.


Archive close-out (2026-11-07): the user explicitly requested sync, archive, commit and push after disclosure of the non-green full gate. Archive retains task 3.1 unchecked (5/6 verified); it does not declare full verification complete. The two modified requirement descriptions were shortened to 476 and 492 characters without changing their meaning or any scenario. The main spec and delta pass strict validation.

Historical full gate: `.task/agent-finish/runs/9fd86e2894924f7cb2a6522ca844c86d.json`, tested identity `793fc4b2500da542fbecd5684c608de0145a47cc3860e776fc4037010416c124`, preserved source/runtime identity. Documentation, OpenSpec, lint, formatting, types, API tests (1,400 passed, 284 skipped), and static contract checks passed. Units were 1,823 passed/1 stale Original quantities failure. The impact sweep was blocked at its 900-second limit after 477 passes and three Home photo-parity timeouts; the Home server log also showed refused SSR requests to the local API at port 5001. No failure was marked passed and the impact timeout was not retried.

Upstream reconciliation: remote branch advanced to `9325722b` with a three-line test-only fix for the stale Original quantities locator. The local task work was rebased onto it without conflicts, preserving that upstream change. A fresh `task test:unit` now passes all 1,824 tests (123 files). Earlier gate failures remain historical evidence; the full impact gate has not been rerun or declared passed. The task's application/test inputs still match the passing live-seam source hashes; spec wording and archival are documentation changes. Subsequent documentation verification covers the resulting planning-file state only.
