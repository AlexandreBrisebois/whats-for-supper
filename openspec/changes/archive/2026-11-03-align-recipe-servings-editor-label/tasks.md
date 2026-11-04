# Tasks

## 1. Horizontal servings field in recipe-detail edit mode

**Outcome and scenarios:** Satisfy all scenarios in `specs/recipe-editing/spec.md`: English and French left-hand labels, narrow-screen usability, and validation below the row.

**Owners and boundaries:** Change only the servings field presentation in `pwa/src/components/recipes/RecipeDetailSheet.tsx` and focused browser coverage in `pwa/e2e/recipes.spec.ts`. Use a non-wrapping horizontal label/input row, a shrinkable input and a separate error block below it. Retain existing `htmlFor`/`id`, error associations, styling tokens, input height, locale keys and test IDs. Do not alter draft/save logic or read-only servings badges.

**Dependencies and prerequisites:** Installed PWA dependencies and Playwright Chromium; repository-managed test server on an available port. Reuse `setupCommonRoutes`, `MOCK_IDS` and the existing schema-compliant mock in `pwa/e2e/mock-api.ts`. Relevant existing boundary is GET/PATCH `/api/recipes/{id}` with the existing detail envelope and optional integer `servings`; no payload or mock-handler changes are required. The optional design artifact is deliberately omitted: this is a local layout correction without architectural ambiguity.

**Acceptance boundary:** Exercise the actual rendered component and CSS in Chromium, with API doubles at the existing network boundary. Test English and French at widths 320, 390 and 1280 CSS pixels, for both initialized and unknown servings. Live backend/database or physical-device qualification is not applicable to this presentation-only slice. Browser acceptance does not establish backend persistence.

- [x] 1.1 Add a parameterized `servings editor layout` regression in `pwa/e2e/recipes.spec.ts`. Assert visible label bounds finish left of input bounds, vertical centers align within 2 CSS pixels, the row fits the sheet without horizontal overflow, and the input has the localized accessible name. Focus and edit the input; enter `0` and verify invalid state, disabled Save and associated feedback below the row; replace with `4` and verify feedback clears without moving the label out of its row. Run `task test:e2e -- recipes.spec.ts --grep 'servings editor layout'` before production edits; record the intended geometry failure and command/result, distinguishing it from tooling failures.
- [x] 1.2 Apply the local horizontal-row correction in `RecipeDetailSheet.tsx`, retaining validation below the row and all existing control semantics. Run `task test:e2e -- recipes.spec.ts --grep 'servings editor layout'` and require all layout scenarios to pass. Inspect screenshots of valid and invalid states in both languages at 320 and 1280 CSS pixels for clipping, overlap and alignment. Record green results and screenshot locations; make no unrelated field or style changes.
- [x] 1.3 Run preservation checks with `task test:unit -- src/components/recipes/RecipeDetailSheet.test.tsx` and `task test:e2e -- recipes.spec.ts --grep 'servings'`. Require existing validation, cancel, retry, save/reopen, unknown-value and view-mode heading scenarios to remain green; record actual results in this file before final verification.

## 2. Final Integration and Verification

- [x] 2.1 Reconcile all scenario evidence, run `task prepare -- <complete changed task paths>`, inspect the full task-owned diff for scope and preservation, and run `task verify -- <complete changed task paths>` including this change's planning files and affected application/test files. Report actual passed, failed, blocked, not-run and not-applicable results plus the invocation's `record_path`; leave tasks incomplete if required acceptance is missing. No sync, archive, commit or deployment is included.

## Implementation evidence

- Red: `task test:e2e -- recipes.spec.ts --grep 'servings editor layout' --workers=2 --max-failures=1` failed on the intended left/right geometry assertion at 320px: label right edge 279px, input left edge 41px (English, unknown servings). Stopped early: 1 failed, 1 interrupted, 10 not run. Production component was unchanged.

- Local-source red confirmation: `BASE_URL=http://127.0.0.1:3107 task test:e2e -- recipes.spec.ts --grep 'servings editor layout en 320 null' --workers=1` failed with the same 279px versus 41px geometry assertion against the original component. Port 3000 serves the Docker app; its first attempted green run was interrupted and is not local-source evidence. The local test server on 3107 was started for this task.
- Green: `BASE_URL=http://127.0.0.1:3107 task test:e2e -- recipes.spec.ts --grep 'servings editor layout' --workers=2` passed all 12 scenarios after the layout fix and scoped preparation. Visual inspection passed for all eight `.task/servings-label/{en,fr}-{320,1280}-{valid,invalid}.png` screenshots: label left, centered input, feedback below, no clipping or overlap.

- Preservation: `BASE_URL=http://127.0.0.1:3107 task test:e2e -- recipes.spec.ts --grep 'servings' --workers=2` passed 24/24, including the 12 new layout cases. `task test:unit -- src/components/recipes/RecipeDetailSheet.test.tsx` passed 55/55 after scoped preparation. API, generated client, mock handlers and translations are unchanged; live endpoint/database/device qualification is not applicable to this local presentation correction.

- Scope review passed: application diff is limited to the servings horizontal wrapper, label/input sizing classes and 12 focused browser scenarios. Existing draft, validation, save, cancel and view-mode logic is unchanged. Scoped preparation passed without unrelated writes.
- Repository verification passed: `BASE_URL=http://127.0.0.1:3107 task verify --` with all six task-owned paths; record `.task/agent-finish/runs/e28cd4666b4c4e2782f32a76cc9bc62b.json`. Documentation, spec validation, lint, formatting, types, unit, impacted browser, API and contract checks all passed; content identity was stable. This record precedes this final task/evidence update; repeat full verification after the update and report the final record in the implementation response.
