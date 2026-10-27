# Tasks

## 1. Make return direction reflect the selected week

**Outcome and scenarios:** Implement the delta for `meal-planning` → “Navigate relative weeks and return to this week.” Cover negative/positive offsets, zero, return navigation with preserved query parameters, and selected-offset changes while old dates remain displayed.

**Owners and boundaries:** `pwa/src/app/(app)/planner/page.tsx`, its unit tests and `pwa/e2e/planner.spec.ts`. Reuse existing Lucide chevrons and `planner.backToThisWeek`; keep `aria-hidden="true"` on the arrow. Branch on `currentWeekOffset`, the same selection used by the control's visibility and destination, rather than deriving time direction from loaded dates. Retain the existing control styles, handler, title and accessible name.

**Dependencies and prerequisites:** Repository tooling and installed test/browser dependencies. No dependency on the badge-removal plan; preserve its files and reconcile shared-file edits during implementation. A design document is deliberately omitted because this conditional rendering change has no architectural, migration or unresolved technical complexity.

**Acceptance boundary:** First observable slice: open `/planner?weekOffset=-1`, see the right chevron after the label, activate it and return to offset zero. Unit tests exercise the actual page with its existing navigation/store doubles. Playwright exercises the page, routing and rendered layout with the existing `pwa/e2e/mock-api.ts` schedule fixtures at `GET /api/schedule`; no handler or contract changes are needed. Browser evidence is presentation/navigation evidence, not live service qualification.

- [ ] 1.1 Add focused cases in `pwa/src/app/(app)/planner/page.test.tsx` for negative offsets (including an offset earlier than -1), positive offsets (including later than +1), zero, and an offset change with retained dates. Assert chevron direction and order relative to the localized label, a stable accessible name and absence at zero. Preserve or add return-navigation assertions for removing `weekOffset` while retaining unrelated query parameters. Run `task test:unit -- 'src/app/(app)/planner/page.test.tsx'` before production edits; record the intended failure for the past-week arrow.
- [ ] 1.2 Conditionally render the left chevron before the label for positive offsets and the right chevron after the label for negative offsets, using the existing imports and handler. Run `task test:unit -- 'src/app/(app)/planner/page.test.tsx'` and record green evidence for the scenario matrix. Do not change locale values, week selection, data loading or adjacent Planner controls.
- [ ] 1.3 Extend the existing week-navigation acceptance in `pwa/e2e/planner.spec.ts` to cover returning from both past and future weeks, current-week absence and preserved query parameters. Run `task test:e2e -- e2e/planner.spec.ts`. Inspect narrow and wide rendered layouts in English and French: arrow on the correct side, full label visible, no clipping, and unchanged accessible name. Record the actual viewport/locale evidence and outcomes. Keep existing navigation and date-content assertions.

## 2. Final Integration and Verification

- [ ] 2.1 Review the complete task-owned diff, preserving the separate badge-removal work. Run `task prepare -- <complete reviewed changed-path set>` then `task verify -- <complete reviewed changed-path set>`, including this change's artifacts and all changed implementation/test paths. Reconcile scenario acceptance with actual passed/failed/blocked/not-run/not-applicable results and cite the returned `record_path`. API/database/model checks are not applicable to this presentation change. Leave tasks incomplete while required evidence is missing; specification sync and archival are separate lifecycle work.
