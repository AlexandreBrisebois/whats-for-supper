# Tasks

## 1. Clarify planned-meal alternatives and enter Search

**Outcome and scenarios:** `tonight-meal-decisions` / Choose a backup before resolving the planned Tonight recipe, all scenarios.
**Owners and boundaries:** `HomeCommandCenter`, `SkipRecoveryDialog`, EN/FR locale strings and existing Home tests. Reuse `QuickFindModal`, `openTodaySearch` and Recipes' target recovery. No API, schema or mock shape changes.
**Dependencies and prerequisites:** Unified Recipes planning entry and authoritative calendar context are available. Preserve concurrent Recipes changes until stable before implementation verification.
**Acceptance boundary:** Render the Home sheet and navigate through the real app route to Recipes against the existing browser fixture's schedule/assignment handlers; test pending and failed calendar resolution. Mocking the backend does not establish production data behavior.

- [ ] 1.1 Add focused component and Playwright regressions before UI edits: planned Change plan exposes localized Take Out, Suggestions and Search; Suggestions opens the limited deck and retains Home disposition; Search carries the captured authoritative `focus=search`, `addToDay`, `weekOffset=0`, `referenceWeekStartDate` without mutating the plan, and a changed source/date cannot retarget silently. Run `cd pwa && npm run test:unit -- src/components/home/HomeCommandCenter.test.tsx` and `cd pwa && npm run test:e2e -- e2e/home-recipe.spec.ts e2e/action-pivot.spec.ts`; record the intended behavioral red result.
- [x] 1.2 Wire the third choice and localized copy, reusing the existing today Search navigation. Keep the sheet available on calendar failure for retry. Run the focused unit and browser commands green; verify no duplicate Quick Find or assignment call on Search entry, and that Suggestions still enters the Home disposition step.
- [x] 1.3 Verify Search selection with an occupied target, cancellation, failed/unknown disposition and subsequent Planner destination through Recipes browser tests (`cd pwa && npm run test:e2e -- e2e/unified-recipes.spec.ts e2e/action-pivot.spec.ts`). Check EN/FR labels, keyboard focus and modal dismissal; update the relevant Home user flow documentation in this slice.

## 2. Place Capture before Tonight

**Outcome and scenarios:** `tonight-meal-decisions` / Reveal Home Capture before the Tonight decision, all scenarios.
**Owners and boundaries:** `HomeCommandCenter` render order, existing `QuickCaptureTrigger`, Home unit/browser tests. Keep the tile, destination and status states unchanged.
**Dependencies and prerequisites:** Slice 1's menu behavior is stable. Use the existing Home fixture states for planned, unplanned, saved-plan and Cooked views.
**Acceptance boundary:** DOM/focus assertions plus rendered phone geometry and scrolling in the app shell; CSS viewport tests cannot prove every device's browser chrome geometry.

- [x] 2.1 Add a DOM order/focus regression to `HomeCommandCenter.test.tsx` and a browser check in `e2e/home-recipe.spec.ts` before moving the tile. Run the focused commands from slice 1 and record the intended red order/initial-visibility result.
- [x] 2.2 Move the single Capture trigger ahead of conditional Tonight content. Rerun the focused checks green, verifying one Capture link, correct route, no altered meal actions and status feedback intact.
- [x] 2.3 Check 393×852 and 320×640 CSS px phones, 200% text, EN/FR, short landscape and tablet using the Home browser fixture. At ordinary size/no notices, assert the complete Capture label/tile is initially visible and before Tonight; for physically constrained views assert no clipping/dock overlap and full keyboard/scroll reachability. Run `cd pwa && npm run test:e2e -- e2e/home-recipe.spec.ts e2e/home-goto.spec.ts e2e/action-pivot.spec.ts` and affected Home unit tests. Record screenshots/measurements and actual limitations.

## 3. Integration and verification

- [x] 3.1 Review the complete change-owned diff and scenarios; run `task verify:plan -- <reviewed changed-path set>`, `task prepare -- <same set>` and `task verify -- <same set>` per the execution harness after concurrent writers settle. Record actual command results, content identity and `record_path`; leave any unrun or blocked qualification explicit. Implementation requires separate user approval. No publication, Docker change, commit, merge or archive is part of this change.
