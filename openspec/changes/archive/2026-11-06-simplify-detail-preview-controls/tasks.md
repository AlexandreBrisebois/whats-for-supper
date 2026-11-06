# Tasks

Applied under Alex’s separate approval. Alex subsequently instructed: “when thats done, sync, archive the spec. I will commit and push, you can skip the tests.” The tracked acceptance below is reconciled to that explicit waiver: post-change runtime tests and the application gate are not required for this archive, and their not-run status remains explicit. Completion here means the authorized implementation and static sync/archive work, not tested runtime behavior.

## 1. Quiet preview area with progressive original/reset recovery

**Outcome/scenarios:** All recipe-library deltas in this change; default five/seven, standalone three, original inspection, failed preview, unknown basis, background retention and bilingual keyboard use.
**Owners/boundaries:** RecipeDetailSheet reading state, ActionGearMenu callbacks, dedicated locale labels and focused tests. Existing projection/preview GET contracts and stateful mocks remain authoritative; no API/backend/data changes.
**Dependencies/prerequisites:** Archived quiet-portions behavior; preserve existing working-tree edits. No other active proposal is a prerequisite.
**Acceptance boundary:** Real detail/menu components and existing mocked preview/projection wrapper; existing live no-write checks remain applicable. No production calls required for this cleanup.

- [x] 1.1 Before implementation, update `RecipeDetailSheet.refinement.test.tsx`, `RecipeDetailSheet.test.tsx` and `ActionGearMenu.test.tsx` for absent inline links/message, retained original-count conditions, menu original/reset during preview, defaults 5/7 and standalone 3, failed-preview reset and no mutation. Run `task test:unit -- src/components/recipes/RecipeDetailSheet.refinement.test.tsx src/components/recipes/RecipeDetailSheet.test.tsx src/components/recipes/ActionGearMenu.test.tsx` and record intended behavioral red.
- [x] 1.2 Remove only requested inline controls/copy; expose existing original-inspection/reset state changes via Recipe actions and add dedicated English/French names. Post-change green execution is waived by Alex; review the implementation diff without claiming a passing test run. Preserve original source access, unknown-yield editing, grocery review, frozen preparation, specific instruction guidance, generation guards and background preview retention; no reset may save or fabricate a default read.
- [x] 1.3 Update browser expectations in `recipe-ingredient-preview.spec.ts` and `quiet-portions-layout.spec.ts` for both languages, constrained layouts, menu focus/targets, failed-read escape, counts and no-write assertions; inspect detail-layout expectations and update affected UI documentation. Browser execution and rendered/runtime acceptance are waived by Alex and remain NOT RUN; source review/formatting establish only the expectation updates.

## 2. Final Integration and Verification

- [x] 2.1 Review complete task-owned scope against before-images, format selected frontend files, sync only the approved recipe-library delta, validate change/main-spec structure and archive as explicitly requested. `task verify`, live no-write acceptance and all post-change runtime tests are waived by Alex and NOT RUN. Record the limits; no deployment, commit, push or other-spec application is authorized.


## Execution evidence and explicit verification waiver

- Implemented only the approved detail/menu cleanup, dedicated EN/FR labels and corresponding unit/browser expectations. Original-count conditions and preview/projection owners are retained. No other active proposal was applied.
- Before the skip-tests instruction arrived, the intended-red command in 1.1 completed: 104 tests passed, 13 failed across 3 files (2 failed files, 1 passed). Failures include the not-yet-implemented new menu names/reset and removed-copy expectation. This is pre-implementation red evidence, not the current implementation result.
- Post-change unit, browser, API/live, database tests and `task verify` were NOT RUN per the explicit user instruction. No green/runtime claim is made. Task 1.2 is marked implemented with its green-run requirement explicitly waived; 1.3 and 2.1 explicitly reflect the user-waived runtime/final-gate scope; checked boxes do not claim those skipped checks passed.
- Browser expectations were updated in recipe-ingredient-preview.spec.ts and quiet-portions-layout.spec.ts; recipe-detail-layout.spec.ts needed no changes. Unit regressions retain original/default counts including standalone three, planned five and prepared seven, failed-preview reset and no-write assertions, but were not rerun.
- Static checks performed: formatting of changed frontend files, whitespace/diff review and OpenSpec structural validation. Canonical sync and archive are authorized with runtime test acceptance waived; archival does not establish runtime verification.
- No deployment, commit or push was performed.
